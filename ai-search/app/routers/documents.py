from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_staff, require_admin
from app.services import document_service
from app.schemas.document import DocumentOut, DocumentListResponse, RenameDocumentRequest, MoveDocumentRequest
from app.repositories import document_repository

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return await document_service.upload_document(file, current_user, db)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return document_service.list_documents(db)


@router.put("/{doc_id}/rename", response_model=DocumentOut)
def rename_document(
    doc_id: int,
    request: RenameDocumentRequest,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    doc = document_repository.rename_document(db, doc_id, request.display_name)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DOCUMENT_NOT_FOUND")
    return doc


@router.put("/{doc_id}/move", response_model=DocumentOut)
def move_document(
    doc_id: int,
    request: MoveDocumentRequest,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    doc = document_repository.move_document(db, doc_id, request.folder_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DOCUMENT_NOT_FOUND")
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    document_service.delete_document(doc_id, db)
