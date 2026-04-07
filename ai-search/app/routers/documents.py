from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_staff, require_admin
from app.services import document_service
from app.schemas.document import DocumentOut, DocumentListResponse

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return await document_service.upload_document(file, current_user, db)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return document_service.list_documents(db)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    document_service.delete_document(doc_id, db)
