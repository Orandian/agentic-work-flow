from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ARRAY, TIMESTAMP, create_engine
from sqlalchemy.orm import DeclarativeBase, Session
from app.config.settings import settings


class Base(DeclarativeBase):
    pass


class AiDocument(Base):
    __tablename__ = "ai_documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size = Column(Integer, nullable=False)
    chunk_count = Column(Integer, nullable=False, default=0)
    chroma_ids = Column(ARRAY(String), nullable=True)
    uploaded_by = Column(String(255), nullable=False)
    uploaded_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    delete_flg = Column(Integer, nullable=False, default=0)


def get_engine(url: str | None = None):
    db_url = url or settings.database_url
    # Normalise legacy postgresql:// → postgresql+psycopg:// for psycopg3
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return create_engine(db_url)


def get_db(engine=None):
    if engine is None:
        engine = get_engine()
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()


def create_document(db: Session, **kwargs) -> AiDocument:
    doc = AiDocument(**kwargs)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(db: Session) -> list[AiDocument]:
    return db.query(AiDocument).filter(AiDocument.delete_flg == 0).all()


def get_document(db: Session, doc_id: int) -> AiDocument | None:
    return (
        db.query(AiDocument)
        .filter(AiDocument.id == doc_id, AiDocument.delete_flg == 0)
        .first()
    )


def soft_delete_document(db: Session, doc_id: int) -> None:
    doc = get_document(db, doc_id)
    if doc:
        doc.delete_flg = 1
        db.commit()
