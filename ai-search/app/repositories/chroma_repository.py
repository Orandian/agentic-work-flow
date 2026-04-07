import threading
import chromadb
from app.config.settings import settings

_client: chromadb.HttpClient | None = None
_collection = None
_lock = threading.Lock()


def _get_collection():
    global _client, _collection
    if _collection is None:
        with _lock:
            if _collection is None:  # double-checked locking
                _client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
                _collection = _client.get_or_create_collection(
                    name=settings.chroma_collection,
                    metadata={"hnsw:space": "cosine"},
                )
    return _collection


def upsert_chunks(
    doc_id: int,
    chunks: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> list[str]:
    collection = _get_collection()
    ids = [f"doc{doc_id}_chunk{i}" for i in range(len(chunks))]
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    return ids


def query_chunks(embedding: list[float], top_k: int) -> dict:
    collection = _get_collection()
    return collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )


def delete_by_doc_id(doc_id: int) -> None:
    collection = _get_collection()
    collection.delete(where={"doc_id": doc_id})
