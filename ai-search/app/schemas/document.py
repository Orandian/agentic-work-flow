from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    file_type: str
    file_size: int
    chunk_count: int
    uploaded_by: str
    uploaded_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentOut]
    total: int
