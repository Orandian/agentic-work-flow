from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.orm import Session
from app.repositories.document_repository import Base


class AiFolder(Base):
    __tablename__ = "ai_folders"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    created_by = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    delete_flg = Column(Integer, nullable=False, default=0)


def list_folders(db: Session) -> list[AiFolder]:
    return db.query(AiFolder).filter(AiFolder.delete_flg == 0).order_by(AiFolder.name).all()


def get_folder(db: Session, folder_id: int) -> AiFolder | None:
    return db.query(AiFolder).filter(AiFolder.id == folder_id, AiFolder.delete_flg == 0).first()


def create_folder(db: Session, name: str, created_by: str) -> AiFolder:
    folder = AiFolder(name=name, created_by=created_by)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def rename_folder(db: Session, folder_id: int, name: str) -> AiFolder | None:
    folder = get_folder(db, folder_id)
    if not folder:
        return None
    folder.name = name
    db.commit()
    db.refresh(folder)
    return folder


def soft_delete_folder(db: Session, folder_id: int) -> None:
    folder = get_folder(db, folder_id)
    if folder:
        folder.delete_flg = 1
        db.commit()
