import os
import re
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from langchain.text_splitter import RecursiveCharacterTextSplitter
import pypdf
import docx
import io

from app.config.settings import settings
from app.schemas.document import DocumentOut, DocumentListResponse
from app.repositories import chroma_repository, document_repository
from app.services import ollama_service

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

# Magic bytes for supported file types
MAGIC_BYTES: dict[str, bytes] = {
    "application/pdf": b"%PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04",
}


def _sanitize_filename(filename: str) -> str:
    """Strip path components and non-alphanumeric characters, preserve extension."""
    basename = os.path.basename(filename)
    # Allow only alphanumerics, dots, hyphens, underscores
    safe = re.sub(r"[^\w.\-]", "_", basename)
    # Collapse leading dots to prevent hidden-file tricks
    return safe.lstrip(".") or "upload"


def _validate_magic_bytes(file_bytes: bytes, content_type: str) -> None:
    magic = MAGIC_BYTES.get(content_type)
    if magic and not file_bytes.startswith(magic):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="UNSUPPORTED_FILE_TYPE",
        )


def _extract_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="ignore")
    elif "wordprocessingml" in content_type:
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="UNSUPPORTED_FILE_TYPE")


async def upload_document(file: UploadFile, current_user: dict, db: Session) -> DocumentOut:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="UNSUPPORTED_FILE_TYPE")

    # Check Content-Length before reading to catch obvious oversized uploads early
    max_bytes = settings.max_file_size_mb * 1024 * 1024

    # Stream-read with size cap to avoid loading a huge file into memory
    chunks_read: list[bytes] = []
    total = 0
    chunk_size = 65536  # 64 KB
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="FILE_TOO_LARGE")
        chunks_read.append(chunk)

    file_bytes = b"".join(chunks_read)

    # Magic-byte validation after content-type check
    _validate_magic_bytes(file_bytes, file.content_type)

    safe_name = _sanitize_filename(file.filename or "upload")

    text = _extract_text(file_bytes, file.content_type)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
    )
    text_chunks = splitter.split_text(text)

    embeddings = ollama_service.embed_batch(text_chunks)

    doc_record = document_repository.create_document(
        db,
        name=safe_name,
        file_type=ALLOWED_TYPES[file.content_type],
        file_size=len(file_bytes),
        chunk_count=len(text_chunks),
        uploaded_by=current_user["email"],
    )

    metadatas = [
        {"doc_id": doc_record.id, "name": safe_name, "chunk_index": i}
        for i in range(len(text_chunks))
    ]
    chroma_ids = chroma_repository.upsert_chunks(doc_record.id, text_chunks, embeddings, metadatas)

    doc_record.chroma_ids = chroma_ids
    db.commit()
    db.refresh(doc_record)

    return DocumentOut.model_validate(doc_record)


def list_documents(db: Session) -> DocumentListResponse:
    docs = document_repository.list_documents(db)
    return DocumentListResponse(
        documents=[DocumentOut.model_validate(d) for d in docs],
        total=len(docs),
    )


def delete_document(doc_id: int, db: Session) -> None:
    doc = document_repository.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DOCUMENT_NOT_FOUND")
    # Soft-delete Postgres row first; Chroma deletion is best-effort after
    document_repository.soft_delete_document(db, doc_id)
    chroma_repository.delete_by_doc_id(doc_id)
