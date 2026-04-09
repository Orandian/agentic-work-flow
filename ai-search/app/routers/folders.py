from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_staff, require_admin
from app.schemas.folder import FolderOut, FolderListResponse, CreateFolderRequest, RenameFolderRequest
from app.repositories import folder_repository

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=FolderListResponse)
def list_folders(
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    folders = folder_repository.list_folders(db)
    return FolderListResponse(folders=folders, total=len(folders))


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    request: CreateFolderRequest,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return folder_repository.create_folder(db, name=request.name, created_by=current_user["email"])


@router.put("/{folder_id}", response_model=FolderOut)
def rename_folder(
    folder_id: int,
    request: RenameFolderRequest,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    folder = folder_repository.rename_folder(db, folder_id, request.name)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FOLDER_NOT_FOUND")
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    current_user: dict = Depends(require_staff),
    db: Session = Depends(get_db),
):
    folder = folder_repository.get_folder(db, folder_id)
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FOLDER_NOT_FOUND")
    folder_repository.soft_delete_folder(db, folder_id)
