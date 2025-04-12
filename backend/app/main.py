from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import extraction

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
    return {
        "message": "Welcome to the Web Assets Extractor API",
        "documentation": "/docs",
        "endpoints": {
            "extract_assets": "/api/extract",
        },
    }