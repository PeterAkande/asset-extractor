import json
import uuid
import redis
from typing import Optional, Dict, Any, Union
import os
from datetime import timedelta

# Redis configuration
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)
CACHE_EXPIRATION = int(os.environ.get('CACHE_EXPIRATION', 86400))  # 24 hours by default

# Initialize Redis client
redis_client = redis.Redis(
    host=REDIS_HOST, 
    port=REDIS_PORT,
    db=REDIS_DB,
    password=REDIS_PASSWORD,
    decode_responses=True  # Automatically decode responses to strings
)

def generate_result_id() -> str:
    """Generate a unique ID for extraction results"""
    return str(uuid.uuid4())

def get_cached_result_by_url(url: str) -> Optional[Dict[str, Any]]:
    """
    Check if a URL has been extracted before and return the cached result
    
    Args:
        url: The URL to check for cached results
        
    Returns:
        The cached result dictionary or None if not found
    """
    # Check if we have a mapping from URL to result_id
    result_id = redis_client.get(f"url:{url}")
    
    if result_id:
        # If found, get the actual result using the ID
        return get_cached_result_by_id(result_id)
    
    return None

def get_cached_result_by_id(result_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a cached result by its ID
    
    Args:
        result_id: The unique ID of the cached result
        
    Returns:
        The cached result dictionary or None if not found
    """
    result_json = redis_client.get(f"result:{result_id}")
    if result_json:
        try:
            return json.loads(result_json)
        except json.JSONDecodeError:
            return None
    return None

def store_result_in_cache(url: str, result: Dict[str, Any], result_id: Optional[str] = None) -> str:
    """
    Store an extraction result in the cache
    
    Args:
        url: The URL that was extracted
        result: The extraction result to cache
        result_id: Optional result ID (if not provided, one will be generated)
        
    Returns:
        The result ID
    """
    if not result_id:
        result_id = generate_result_id()
    
    # Store the result with the ID
    redis_client.set(
        f"result:{result_id}", 
        json.dumps(result),
        ex=CACHE_EXPIRATION  # Set expiration time
    )
    
    # Create a mapping from URL to result_id
    redis_client.set(
        f"url:{url}", 
        result_id,
        ex=CACHE_EXPIRATION  # Set same expiration time
    )
    
    return result_id

def list_cached_results(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    List available cached results
    
    Args:
        limit: Maximum number of results to return
        offset: Number of results to skip
        
    Returns:
        Dictionary with pagination info and list of result IDs with metadata
    """
    # Get all keys that start with "result:"
    cursor = 0
    keys = []
    
    # Use scan for better performance with large datasets
    while True:
        cursor, partial_keys = redis_client.scan(cursor, "result:*", count=1000)
        keys.extend(partial_keys)
        if cursor == 0:
            break
    
    # Get pagination info
    total = len(keys)
    results = []
    
    # Apply pagination
    paginated_keys = keys[offset:offset+limit]
    
    # Get result metadata for each key
    for key in paginated_keys:
        result_id = key.replace("result:", "")
        result_data = get_cached_result_by_id(result_id)
        
        if result_data:
            results.append({
                "id": result_id,
                "url": result_data.get("url", "Unknown URL"),
                "timestamp": result_data.get("timestamp", None),
            })
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": results
    }

def ping_redis() -> bool:
    """Check if Redis is available"""
    try:
        return redis_client.ping()
    except redis.exceptions.ConnectionError:
        return False
