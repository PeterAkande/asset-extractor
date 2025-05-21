from mcp.server.fastmcp import FastMCP

from app.schemas.extractor_schema import (
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
    description="Automatically analyzes any website URL and extracts key visual and design elements such as colors, fonts, images, and other assets used on the site.",
)
async def extract_all_assets(
    url: str,
) -> ExtractorResponse:
    """
    Automatically analyzes any website URL and extracts key visual and design elements such as colors, fonts, images, and other assets used on the site..
    """

    url_request = URLRequest(url=url)
    return await extractor_service.extract_assets(url_request)
