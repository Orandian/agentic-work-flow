from fastapi import APIRouter, Depends

from app.dependencies import require_staff
from app.services import rag_service
from app.schemas.search import SearchRequest, SearchResponse

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    current_user: dict = Depends(require_staff),
):
    return rag_service.search(request, current_user)
