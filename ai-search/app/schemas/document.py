from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:           int
    name:         str
    display_name: str | None
    file_type:    str
    file_size:    int
    chunk_count:  int
    uploaded_by:  str
    uploaded_at:  datetime
    folder_id:    int | None


class DocumentListResponse(BaseModel):
    documents: list[DocumentOut]
    total:     int


class RenameDocumentRequest(BaseModel):
    display_name: str


class MoveDocumentRequest(BaseModel):
    folder_id: int | None   # None = move to root
