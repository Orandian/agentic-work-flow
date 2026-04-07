"""
test_documents.py — integration tests for the /documents endpoints.

Upload tests mock document_service.upload_document at the service level to
avoid hitting ChromaDB or the embedding model.  List / delete tests use the
SQLite in-memory DB provided by the app fixture.
"""
import io
from datetime import datetime

import pytest

from app.schemas.document import DocumentOut


# ---------------------------------------------------------------------------
# Minimal valid PDF bytes (3-page stub accepted by most validators)
# ---------------------------------------------------------------------------
_MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f\n"
    b"trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n9\n%%EOF"
)


# ---------------------------------------------------------------------------
# Helper: build a fake DocumentOut for mock returns
# ---------------------------------------------------------------------------

def _fake_doc_out() -> DocumentOut:
    return DocumentOut(
        id=1,
        name="test.pdf",
        file_type="pdf",
        file_size=len(_MINIMAL_PDF),
        chunk_count=2,
        uploaded_by="admin@test.com",
        uploaded_at=datetime.utcnow(),
    )


# ---------------------------------------------------------------------------
# Upload tests
# ---------------------------------------------------------------------------

def test_upload_pdf_admin(client, admin_headers, monkeypatch):
    """ADMIN token + valid PDF → mock service returns DocumentOut → 201."""
    import app.services.document_service as doc_svc

    fake_doc = _fake_doc_out()

    async def _mock_upload(file, current_user, db):
        return fake_doc

    monkeypatch.setattr(doc_svc, "upload_document", _mock_upload)

    response = client.post(
        "/documents/upload",
        headers=admin_headers,
        files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert "name" in body
    assert "file_type" in body


def test_upload_staff_forbidden(client, staff_headers, monkeypatch):
    """STAFF role is not permitted to upload — expect 403."""
    import app.services.document_service as doc_svc

    async def _mock_upload(file, current_user, db):  # pragma: no cover
        return _fake_doc_out()

    monkeypatch.setattr(doc_svc, "upload_document", _mock_upload)

    response = client.post(
        "/documents/upload",
        headers=staff_headers,
        files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
    )

    assert response.status_code == 403


def test_upload_unsupported_type(client, admin_headers, monkeypatch):
    """ADMIN token + image/png content-type → 415 Unsupported Media Type."""
    import app.services.document_service as doc_svc

    # We do NOT mock upload_document here; the real function checks content_type
    # before doing anything expensive and raises 415 immediately.

    response = client.post(
        "/documents/upload",
        headers=admin_headers,
        files={"file": ("photo.png", io.BytesIO(b"\x89PNG\r\n"), "image/png")},
    )

    assert response.status_code == 415


# ---------------------------------------------------------------------------
# List tests
# ---------------------------------------------------------------------------

def test_list_documents_staff(client, staff_headers, monkeypatch):
    """STAFF token, mocked list returns empty → 200 with documents and total keys."""
    import app.services.document_service as doc_svc
    from app.schemas.document import DocumentListResponse

    monkeypatch.setattr(
        doc_svc,
        "list_documents",
        lambda db: DocumentListResponse(documents=[], total=0),
    )

    response = client.get("/documents", headers=staff_headers)

    assert response.status_code == 200
    body = response.json()
    assert "documents" in body
    assert "total" in body


def test_list_documents_no_token(client):
    """Missing Authorization header → 403."""
    response = client.get("/documents")

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Delete tests
# ---------------------------------------------------------------------------

def test_delete_document_admin(client, admin_headers, monkeypatch):
    """ADMIN token + existing doc_id → mock delete → 204 No Content."""
    import app.services.document_service as doc_svc

    monkeypatch.setattr(doc_svc, "delete_document", lambda doc_id, db: None)

    response = client.delete("/documents/1", headers=admin_headers)

    assert response.status_code == 204


def test_delete_document_staff_forbidden(client, staff_headers, monkeypatch):
    """STAFF role is not permitted to delete — expect 403."""
    import app.services.document_service as doc_svc

    monkeypatch.setattr(doc_svc, "delete_document", lambda doc_id, db: None)  # pragma: no cover

    response = client.delete("/documents/1", headers=staff_headers)

    assert response.status_code == 403


def test_delete_document_not_found(client, admin_headers, monkeypatch):
    """ADMIN token + non-existent doc_id → service raises 404 → response is 404."""
    from fastapi import HTTPException
    import app.services.document_service as doc_svc

    def _raise_404(doc_id, db):
        raise HTTPException(status_code=404, detail="DOCUMENT_NOT_FOUND")

    monkeypatch.setattr(doc_svc, "delete_document", _raise_404)

    response = client.delete("/documents/9999", headers=admin_headers)

    assert response.status_code == 404
