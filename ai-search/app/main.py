from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler

from app.config.settings import settings
from app.routers import health, documents, search
from app.services import document_service, rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up shared embedding model singleton to avoid cold-start on first request
    document_service._get_embedding_model()
    rag_service._get_embedding_model()
    yield


app = FastAPI(
    title="ActiveCity AI Search",
    version="1.0.0",
    description="RAG-powered internal document search for ActiveCity Staff Portal",
    lifespan=lifespan,
    # Disable interactive docs in production
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
    openapi_url="/openapi.json" if settings.app_env != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return await http_exception_handler(request, exc)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "INTERNAL_SERVER_ERROR", "status_code": 500},
    )


app.include_router(health.router)
app.include_router(documents.router)
app.include_router(search.router)
