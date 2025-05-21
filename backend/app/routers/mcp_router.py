from mcp.server.fastmcp import FastMCP

from app.schemas.extractor_schema import (
    ErrorResponse,
    ExtractorResponse,
    URLRequest,
)

from app.services import extractor_service


mcp_app = FastMCP(
    name="AssetExtractorServer",
    version="1.0.0",
    description="MCP server for extracting web assets like colors, fonts, images, etc., from URLs.",
)


@mcp_app.tool(
    name="extract_assets",
    description="Extracts web assets like colors, fonts, images, etc., from a given URL.",
)
async def extract_all_assets(
    url: str,
) -> ExtractorResponse:
    """
    Extracts web assets like colors, fonts, images, etc., from a given URL.
    """

    print(f"Extracting assets from URL: {url}")


    url_request = URLRequest(url=url)
    return await extractor_service.extract_assets(url_request)
