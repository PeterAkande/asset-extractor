from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import extraction
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

logger = logging.getLogger("asset-extractor")

app = FastAPI(
    title="Web Assets Extractor API",
    description="API for extracting colors, fonts, and assets from web URLs",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(extraction.router)

@app.get("/")
async def root():
    """
    Root endpoint that returns a welcome message.
    """
    logger.info("Root endpoint accessed")
    return {
        "message": "Welcome to the Web Assets Extractor API",
        "documentation": "/docs",
        "endpoints": {
            "api_index": "/api",
            "extract_assets": "/api/extract",
            "stream_extraction": "/api/extract/sse",
        },
    }

# Startup event to log when the app starts
@app.on_event("startup")
async def startup_event():
    logger.info("Asset Extractor API started")
    logger.info("Available endpoints: /, /api, /api/extract, /api/extract/sse, /docs")