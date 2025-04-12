import traceback
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..utils.extractor import extract_from_url, stream_extraction_from_url
import validators
from ..models import ExtractorResponse, ErrorResponse, ExtractorResult
import asyncio
import json

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

@router.get("/extract-sse")
async def extract_assets_sse(request: Request):
    """
    Stream extraction progress and results using Server-Sent Events (SSE)
    """
    url = request.query_params.get("url")
    if not url:
        return StreamingResponse(
            content=stream_error_message("Missing URL parameter"),
            media_type="text/event-stream"
        )
    
    if not validators.url(url):
        return StreamingResponse(
            content=stream_error_message("Invalid URL format"),
            media_type="text/event-stream"
        )
    
    return StreamingResponse(
        content=stream_extraction(url),
        media_type="text/event-stream"
    )

async def stream_error_message(message):
    """Stream a single error message"""
    yield f"data: {json.dumps({'event': 'error', 'message': message})}\n\n"

async def stream_extraction(url):
    """Stream extraction progress and results"""
    queue = asyncio.Queue()
    extraction_task = None
    extraction_result = None
    
    # Callback function to handle progress updates
    def progress_callback(stage, data):
        queue.put_nowait({
            "event": "progress", 
            "stage": stage,
            "data": data
        })
    
    try:
        # Send initial message
        yield f"data: {json.dumps({'event': 'start', 'url': url})}\n\n"
        
        # Start extraction in background task
        extraction_task = asyncio.create_task(
            stream_extraction_from_url(url, progress_callback)
        )
        
        # Stream progress updates
        while True:
            # Check if extraction is complete
            if extraction_task.done():
                if not extraction_result:
                    # Get the final result
                    try:
                        extraction_result = extraction_task.result()
                        
                        # Validate the result to prevent NoneType errors
                        if not extraction_result:
                            queue.put_nowait({
                                "event": "error",
                                "message": "Extraction returned no result"
                            })
                        elif "error" in extraction_result:
                            queue.put_nowait({
                                "event": "error",
                                "message": extraction_result["error"]
                            })
                        else:
                            # Ensure the result has the expected structure
                            safe_result = {
                                "url": url,
                                "colors": {
                                    "from_css": extraction_result.get("colors", {}).get("from_css", []),
                                    "from_images": extraction_result.get("colors", {}).get("from_images", [])
                                },
                                "fonts": extraction_result.get("fonts", []),
                                "assets": {
                                    "images": extraction_result.get("assets", {}).get("images", []),
                                    "videos": extraction_result.get("assets", {}).get("videos", []),
                                    "scripts": extraction_result.get("assets", {}).get("scripts", []),
                                    "stylesheets": extraction_result.get("assets", {}).get("stylesheets", [])
                                }
                            }
                            queue.put_nowait({
                                "event": "complete",
                                "result": safe_result
                            })
                    except Exception as e:
                        traceback.print_exc()
                        queue.put_nowait({
                            "event": "error",
                            "message": f"Extraction failed: {str(e)}"
                        })
            
            # Get message from queue with timeout
            try:
                message = await asyncio.wait_for(queue.get(), timeout=0.5)
                yield f"data: {json.dumps(message)}\n\n"
                
                # Exit the loop if we've sent the complete result
                if message.get("event") in ["complete", "error"] and extraction_task.done():
                    break
            except asyncio.TimeoutError:
                # No message in queue, but extraction might be complete
                if extraction_task.done() and extraction_result:
                    break
                # Send a keepalive comment to prevent timeout
                yield ": keepalive\n\n"
    
    except asyncio.CancelledError:
        if extraction_task and not extraction_task.done():
            extraction_task.cancel()
        yield f"data: {json.dumps({'event': 'cancelled'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
    finally:
        # Final message indicating stream is closing
        yield f"data: {json.dumps({'event': 'end'})}\n\n"