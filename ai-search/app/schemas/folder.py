from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         int
    name:       str
    created_by: str | None
    created_at: datetime


class FolderListResponse(BaseModel):
    folders: list[FolderOut]
    total:   int


class CreateFolderRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class RenameFolderRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
