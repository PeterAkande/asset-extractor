from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..utils.extractor import extract_from_url
import validators
from ..models import ExtractorResponse, ErrorResponse, ExtractorResult

router = APIRouter(
    prefix="/api",
    tags=["extraction"],
    responses={404: {"description": "Not found"}},
)

class URLRequest(BaseModel):
    url: str
    
    class Config:
        schema_extra = {
            "example": {
                "url": "https://example.com"
            }
        }

@router.post("/extract", response_model=ExtractorResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def extract_assets(request: URLRequest):
    """
    Extract colors, fonts and assets from a web URL.
    
    Returns:
        ExtractorResponse: A structured response containing colors, fonts, and assets from the web page
    
    Raises:
        HTTPException: If the URL is invalid or if there's an error during extraction
    """
    # Validate URL
    if not validators.url(request.url):
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    try:
        # Extract assets, colors and fonts
        result = await extract_from_url(request.url)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")