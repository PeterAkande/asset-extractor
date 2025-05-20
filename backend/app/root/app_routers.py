from fastapi import APIRouter

from app.routers.extractor_router import router as extractor_router


api = APIRouter(prefix="/api")


api.include_router(extractor_router)
