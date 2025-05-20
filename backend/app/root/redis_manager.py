import json
import os
from typing import Union
import redis


REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
REDIS_DB = int(os.environ.get("REDIS_DB", 0))
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)
# CACHE_EXPIRATION = int(os.environ.get("CACHE_EXPIRATION", 86400))  # 24 hours by default
CACHE_EXPIRATION = 86400 * 10  # 10 days by default


class RedisManager:
    def __init__(self) -> None:
        self.redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            decode_responses=True,  # Automatically decode responses to strings
        )

    def cache_json_item(self, key: str, value: dict, ttl: int = 3600):
        """
        Caches a JSON Item for some time set with the ttl- time to live.

        After the TTL, it is cleared from the Redis Db.
        Its Expiration date is 3600s (1 Hr) by default
        """
        value_as_string = json.dumps(value)

        resp = self.redis_client.set(name=key, value=value_as_string, ex=ttl)

    def get_cached_json_item(self, key: str) -> Union[dict, None]:
        value = self.redis_client.get(name=key)

        if value is None:
            return None

        value_decoded = json.loads(value)

        return value_decoded

    def cache_string_item(self, key: str, value: dict, ttl: int | None = None):
        """
        Caches a String Item for some time set with the ttl- time to live.

        After the TTL, it is cleared from the Redis Db.
        Its Expiration date is 3600s (1 Hr) by default
        """

        self.redis_client.set(name=key, value=value, ex=ttl)

    def get_cached_string_item(self, key: str) -> Union[str, None]:
        value = self.redis_client.get(name=key)

        if value is None:
            return None

        if isinstance(value, bytes):
            # Decode bytes to string
            return value.decode("utf-8")

        # If it's not bytes, just return the string
        return value

    def delete_key(self, key: str):
        self.redis_client.delete(key)

    def delete_key(self, key: str):
        self.redis_client.delete(key)


redis_manager = RedisManager()


def ping_redis() -> bool:
    """Check if Redis is available"""
    try:
        return redis_manager.redis_client.ping()
    except redis.exceptions.ConnectionError:
        return False
