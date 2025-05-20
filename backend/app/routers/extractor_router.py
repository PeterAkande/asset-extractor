from fastapi import APIRouter, Request, Query, Path

from app.root.redis_manager import ping_redis
from app.schemas.extractor_schema import (
    ErrorResponse,
    ExtractorResponse,
    URLRequest,
)

from app.services import extractor_service

import logging

logger = logging.getLogger("extractor-router")

router = APIRouter(
    tags=["Extractror"],
    responses={404: {"description": "Not found"}},
)


# Add a simple index route for the /api endpoint
@router.get("/", summary="API Information")
async def api_index():
    """
    Returns information about the API endpoints.
    This serves as a simple health check and documentation entry point.
    """
    # Check if Redis is available
    redis_available = ping_redis()

    return {
        "status": "ok",
        "version": "1.0.0",
        "redis_available": redis_available,
        "endpoints": {
            "extract": "/api/extract",
            "stream": "/api/extract/sse",
            "cache": "/api/cache",
            "cache_by_id": "/api/cache/{result_id}",
        },
        "documentation": "/docs",
    }


@router.post(
    "/extract",
    response_model=ExtractorResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def extract_assets(request: URLRequest):
    """
    Extract colors, fonts and assets from a web URL.

    If the URL has been extracted before and cached, returns the cached result
    unless force_refresh is set to True.

    Returns:
        ExtractorResponse: A structured response containing colors, fonts, and assets from the web page

    Raises:
        HTTPException: If the URL is invalid or if there's an error during extraction
    """

    return await extractor_service.extract_assets(request)


@router.get("/extract/sse")
async def extract_assets_sse(
    request: Request,
    url: str = Query(..., description="URL to extract assets from"),
    force_refresh: bool = Query(False, description="Force a refresh even if cached"),
):
    """
    Stream extraction progress and results using Server-Sent Events (SSE)
    """
    return await extractor_service.extract_assets_sse(
        # request=request,
        url=url,
        force_refresh=force_refresh,
    )


# @router.get(
#     "/cache", response_model=CachedResultsList, summary="List cached extraction results"
# )
# async def list_cache(
#     limit: int = Query(20, description="Maximum number of results to return"),
#     offset: int = Query(0, description="Number of results to skip"),
# ):
#     """
#     List available cached extraction results with pagination.
#     """
#     try:
#         results = list_cached_results(limit=limit, offset=offset)
#         return results
#     except Exception as e:
#         logger.error(f"Error listing cached results: {str(e)}")
#         raise HTTPException(
#             status_code=500, detail=f"Failed to list cached results: {str(e)}"
#         )


@router.get(
    "/cache/{result_id}",
    response_model=ExtractorResponse,
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Get cached extraction result by ID",
)
async def get_cached_result(
    result_id: str = Path(..., description="ID of the cached result to retrieve")
):
    """
    Retrieve a cached extraction result by its ID.
    """
    return await extractor_service.get_cached_result_by_id(result_id=result_id)


# async def stream_cached_result(result):
#     """Stream a cached result with appropriate events"""
#     # Send initial message
#     yield f"data: {json.dumps({'event': 'start', 'url': result.get('url')})}\n\n"
#     yield f"data: {json.dumps({'event': 'cached_result', 'result_id': result.get('result_id')})}\n\n"

#     # Small delay to simulate processing
#     await asyncio.sleep(0.5)

#     # Send the complete result
#     yield f"data: {json.dumps({'event': 'complete', 'result': result})}\n\n"
#     yield f"data: {json.dumps({'event': 'end'})}\n\n"


# async def stream_error_message(message):
#     """Stream a single error message"""
#     yield f"data: {json.dumps({'event': 'error', 'message': message})}\n\n"


# async def stream_extraction(url):
#     """Stream extraction progress and results"""
#     queue = asyncio.Queue()
#     extraction_task = None
#     extraction_result = None

#     # Callback function to handle progress updates
#     def progress_callback(stage, data):
#         queue.put_nowait({"event": "progress", "stage": stage, "data": data})

#     try:
#         # Send initial message
#         yield f"data: {json.dumps({'event': 'start', 'url': url})}\n\n"

#         # Start extraction in background task
#         extraction_task = asyncio.create_task(
#             stream_extraction_from_url(url, progress_callback)
#         )

#         # Stream progress updates
#         # Todo: Use broadcast and redis pub/sub for real-time updates
#         while True:
#             # Check if extraction is complete
#             if extraction_task.done():
#                 if not extraction_result:
#                     # Get the final result
#                     try:
#                         extraction_result = extraction_task.result()

#                         # Validate the result to prevent NoneType errors
#                         if not extraction_result:
#                             queue.put_nowait(
#                                 {
#                                     "event": "error",
#                                     "message": "Extraction returned no result",
#                                 }
#                             )
#                         elif "error" in extraction_result:
#                             queue.put_nowait(
#                                 {
#                                     "event": "error",
#                                     "message": extraction_result["error"],
#                                 }
#                             )
#                         else:
#                             # Add timestamp
#                             extraction_result["timestamp"] = datetime.now().isoformat()

#                             # Store in cache and get ID
#                             result_id = store_result_in_cache(url, extraction_result)
#                             extraction_result["result_id"] = result_id

#                             # Ensure the result has the expected structure
#                             safe_result = {
#                                 "url": url,
#                                 "result_id": result_id,
#                                 "timestamp": extraction_result["timestamp"],
#                                 "colors": {
#                                     "from_css": extraction_result.get("colors", {}).get(
#                                         "from_css", []
#                                     ),
#                                     "from_images": extraction_result.get(
#                                         "colors", {}
#                                     ).get("from_images", []),
#                                 },
#                                 "fonts": extraction_result.get("fonts", []),
#                                 "assets": {
#                                     "images": extraction_result.get("assets", {}).get(
#                                         "images", []
#                                     ),
#                                     "videos": extraction_result.get("assets", {}).get(
#                                         "videos", []
#                                     ),
#                                     "scripts": extraction_result.get("assets", {}).get(
#                                         "scripts", []
#                                     ),
#                                     "stylesheets": extraction_result.get(
#                                         "assets", {}
#                                     ).get("stylesheets", []),
#                                     "icons": extraction_result.get("assets", {}).get(
#                                         "icons", []
#                                     ),
#                                     "audios": extraction_result.get("assets", {}).get(
#                                         "audios", []
#                                     ),
#                                     "fonts": extraction_result.get("assets", {}).get(
#                                         "fonts", []
#                                     ),
#                                     "others": extraction_result.get("assets", {}).get(
#                                         "others", []
#                                     ),
#                                     "svgs": extraction_result.get("assets", {}).get(
#                                         "svgs", []
#                                     ),
#                                 },
#                             }
#                             queue.put_nowait(
#                                 {"event": "complete", "result": safe_result}
#                             )
#                     except Exception as e:
#                         traceback.print_exc()
#                         queue.put_nowait(
#                             {
#                                 "event": "error",
#                                 "message": f"Extraction failed: {str(e)}",
#                             }
#                         )

#             # Get message from queue with timeout
#             try:
#                 message = await asyncio.wait_for(queue.get(), timeout=0.5)
#                 yield f"data: {json.dumps(message)}\n\n"

#                 # Exit the loop if we've sent the complete result
#                 if (
#                     message.get("event") in ["complete", "error"]
#                     and extraction_task.done()
#                 ):
#                     break
#             except asyncio.TimeoutError:
#                 # No message in queue, but extraction might be complete
#                 if extraction_task.done() and extraction_result:
#                     break
#                 # Send a keepalive comment to prevent timeout
#                 yield ": keepalive\n\n"

#     except asyncio.CancelledError:
#         if extraction_task and not extraction_task.done():
#             extraction_task.cancel()
#         yield f"data: {json.dumps({'event': 'cancelled'})}\n\n"
#     except Exception as e:
#         yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
#     finally:
#         # Final message indicating stream is closing
#         yield f"data: {json.dumps({'event': 'end'})}\n\n"
