from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "activecity-ai-search"
    app_env: str = "development"
    app_port: int = 8000

    anthropic_api_key: str = ""

    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_collection: str = "activecity-docs"

    database_url: str  # Required — set DATABASE_URL in .env

    jwt_secret: str  # Required — must match Spring Boot JWT_SECRET exactly
    jwt_algorithm: str = "HS256"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    rag_top_k: int = 5
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50

    allowed_origins: str = "http://localhost:3000"
    max_file_size_mb: int = 20

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
