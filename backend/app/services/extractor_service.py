import asyncio
from datetime import datetime
import json
import time
import logging
import traceback
import uuid
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import validators

from app.root.redis_manager import RedisManager
from app.schemas.extractor_schema import ExtractorResponse, URLRequest

from app.services.utils import extractor


logger = logging.getLogger("extractor-router")

redis_manager = RedisManager()


def generate_result_id() -> str:
    """Generate a unique ID for extraction results"""
    return str(uuid.uuid4())


def get_result_key(result_id: str) -> str:
    """
    Generate a Redis key for the given result ID.

    Args:
        result_id: The result ID to generate a key for.

    Returns:
        A string representing the Redis key.
    """
    return f"result:{result_id}"


def get_url_key(url: str) -> str:
    """
    Generate a Redis key for the given URL.

    Args:
        url: The URL to generate a key for.

    Returns:
        A string representing the Redis key.
    """
    return f"url:{url}"


async def extract_assets(url_request: URLRequest) -> ExtractorResponse:

    # Validate URL
    if not validators.url(url_request.url):
        raise HTTPException(status_code=400, detail="Invalid URL format")

    try:
        # Check if we have cached results for this URL
        if not url_request.force_refresh:

            url_key = get_url_key(url_request.url)
            cached_result = redis_manager.get_cached_json_item(url_key)

            if cached_result:
                logger.info(f"Using cached result for URL: {url_request.url}")
                cached_result["cached"] = True
                return cached_result

        # No cache or force refresh url_requested, perform extraction
        start_time = time.time()
        result = await extractor.extract_from_url(url_request.url)
        extraction_time = time.time() - start_time

        logger.info(f"Extraction completed in {extraction_time:.2f} seconds")

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        # Add timestamp to the result
        result["timestamp"] = datetime.now().isoformat()

        # Store result in cache and get a result_id
        result_id = generate_result_id()
        url_key = get_url_key(url_request.url)

        result["url"] = url_request.url
        result["extraction_time"] = extraction_time
        result["result_id"] = result_id

        redis_manager.cache_json_item(
            url_key,
            result,
            ttl=3600 * 12,
        )  # Cache the result for 12 hours

        redis_manager.cache_string_item(
            get_result_key(result_id),
            url_request.url,
            ttl=3600 * 12,
        )  # Cache the result for 12 hours

        result["cached"] = False

        return ExtractorResponse(**result)
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def get_cached_result_by_id(result_id: str) -> ExtractorResponse:
    """
    Get a cached result by its ID.

    Args:
        result_id: The unique ID of the cached result.

    Returns:
        The cached result as an ExtractorResponse object.
    """
    try:

        # Get the cache result key
        result_key = get_result_key(result_id)

        # Check if we have a mapping from result_id to URL
        url = redis_manager.get_cached_string_item(result_key)
        if not url:
            raise HTTPException(status_code=404, detail="Result not found")

        # If found, get the actual result using the url
        cached_result = redis_manager.get_cached_json_item(get_url_key(url))

        if cached_result:
            # If found, return the actual result using the ID
            cached_result["cached"] = True
            return ExtractorResponse(**cached_result)

        raise HTTPException(status_code=404, detail="Result not found")
    except Exception as e:
        logger.error(f"Error retrieving cached result: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


#### Streaming sse
async def extract_assets_sse(url: str, force_refresh: bool):
    if not url:
        return StreamingResponse(
            content=stream_error_message("Missing URL parameter"),
            media_type="text/event-stream",
        )

    if not validators.url(url):
        return StreamingResponse(
            content=stream_error_message("Invalid URL format"),
            media_type="text/event-stream",
        )

    # Check for cached results if not forcing refresh
    if not force_refresh:
        url_key = get_url_key(url)
        cached_result = redis_manager.get_cached_json_item(url_key)

        if cached_result:
            return StreamingResponse(
                content=stream_cached_result(cached_result),
                media_type="text/event-stream",
            )

    return StreamingResponse(
        content=stream_extraction(url), media_type="text/event-stream"
    )


async def stream_cached_result(result):
    """Stream a cached result with appropriate events"""
    # Send initial message
    yield f"data: {json.dumps({'event': 'start', 'url': result.get('url')})}\n\n"
    yield f"data: {json.dumps({'event': 'cached_result', 'result_id': result.get('result_id')})}\n\n"

    # Small delay to simulate processing
    await asyncio.sleep(0.5)

    # Send the complete result
    yield f"data: {json.dumps({'event': 'complete', 'result': result})}\n\n"
    yield f"data: {json.dumps({'event': 'end'})}\n\n"


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
        queue.put_nowait({"event": "progress", "stage": stage, "data": data})

    try:
        # Send initial message
        yield f"data: {json.dumps({'event': 'start', 'url': url})}\n\n"

        # Start extraction in background task
        extraction_task = asyncio.create_task(
            extractor.stream_extraction_from_url(url, progress_callback)
        )

        # Stream progress updates
        # Todo: Use broadcast and redis pub/sub for real-time updates
        while True:
            # Check if extraction is complete
            if extraction_task.done():
                if not extraction_result:
                    # Get the final result
                    try:
                        extraction_result = extraction_task.result()

                        # Validate the result to prevent NoneType errors
                        if not extraction_result:
                            queue.put_nowait(
                                {
                                    "event": "error",
                                    "message": "Extraction returned no result",
                                }
                            )
                        elif "error" in extraction_result:
                            queue.put_nowait(
                                {
                                    "event": "error",
                                    "message": extraction_result["error"],
                                }
                            )
                        else:
                            # Add timestamp
                            extraction_result["timestamp"] = datetime.now().isoformat()

                            # Store in cache and get ID
                            result_id = generate_result_id()
                            url_key = get_url_key(url)

                            extraction_result["result_id"] = result_id
                            extraction_result["url"] = url
                            extraction_result["cached"] = False

                            redis_manager.cache_json_item(
                                url_key,
                                extraction_result,
                                ttl=3600 * 12,
                            )

                            redis_manager.cache_string_item(
                                get_result_key(result_id),
                                url,
                                ttl=3600 * 12,
                            )  # Cache the result for 12 hours

                            # Ensure the result has the expected structure
                            """
                            safe_result = {
                                "url": url,
                                "result_id": result_id,
                                "timestamp": extraction_result["timestamp"],
                                "colors": {
                                    "from_css": extraction_result.get("colors", {}).get(
                                        "from_css", []
                                    ),
                                    "from_images": extraction_result.get(
                                        "colors", {}
                                    ).get("from_images", []),
                                },
                                "fonts": extraction_result.get("fonts", []),
                                "assets": {
                                    "images": extraction_result.get("assets", {}).get(
                                        "images", []
                                    ),
                                    "videos": extraction_result.get("assets", {}).get(
                                        "videos", []
                                    ),
                                    "scripts": extraction_result.get("assets", {}).get(
                                        "scripts", []
                                    ),
                                    "stylesheets": extraction_result.get(
                                        "assets", {}
                                    ).get("stylesheets", []),
                                    "icons": extraction_result.get("assets", {}).get(
                                        "icons", []
                                    ),
                                    "audios": extraction_result.get("assets", {}).get(
                                        "audios", []
                                    ),
                                    "fonts": extraction_result.get("assets", {}).get(
                                        "fonts", []
                                    ),
                                    "others": extraction_result.get("assets", {}).get(
                                        "others", []
                                    ),
                                    "svgs": extraction_result.get("assets", {}).get(
                                        "svgs", []
                                    ),
                                },
                            }
                            
                            """
                            queue.put_nowait(
                                {"event": "complete", "result": extraction_result}
                            )
                    except Exception as e:
                        traceback.print_exc()
                        queue.put_nowait(
                            {
                                "event": "error",
                                "message": f"Extraction failed: {str(e)}",
                            }
                        )

            # Get message from queue with timeout
            try:
                message = await asyncio.wait_for(queue.get(), timeout=0.5)
                yield f"data: {json.dumps(message)}\n\n"

                # Exit the loop if we've sent the complete result
                if (
                    message.get("event") in ["complete", "error"]
                    and extraction_task.done()
                ):
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
