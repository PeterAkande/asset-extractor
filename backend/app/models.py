from pydantic import BaseModel, HttpUrl, Field
from typing import List, Dict, Optional, Any, Union


class ColorInfo(BaseModel):
    """Model for color information"""
    name: str = Field(..., description="The name of the color")
    hex: str = Field(..., description="The hexadecimal representation of the color")
    rgb: List[int] = Field(..., description="The RGB values of the color")
    count: Optional[int] = Field(None, description="The frequency or pixel count of the color (used for sorting)")
    percentage: Optional[float] = Field(None, description="The percentage of the color in the image (used for sorting)")
    source: Optional[str] = Field(None, description="The source URL of the image containing the color")

    class Config:
        schema_extra = {
            "example": {
                "name": "steelblue",
                "hex": "#4682b4",
                "rgb": [70, 130, 180],
                "count": 42,
                "percentage": 15.7,
                "source": "https://example.com/image.jpg"
            }
        }


class FontInfo(BaseModel):
    """Model for font information"""
    name: str = Field(..., description="The name of the font")
    type: str = Field(..., description="The type of font (Google Font, @font-face, inline, etc.)")


class AssetCollection(BaseModel):
    """Model for asset collections"""
    images: List[str] = Field(default_factory=list, description="URLs of images found on the page")
    videos: List[str] = Field(default_factory=list, description="URLs of videos found on the page")
    scripts: List[str] = Field(default_factory=list, description="URLs of JavaScript files found on the page")
    stylesheets: List[str] = Field(default_factory=list, description="URLs of CSS files found on the page")
    icons: List[str] = Field(default_factory=list, description="SVG icons found on the page (typically smaller vector graphics)")
    svgs: List[str] = Field(default_factory=list, description="Regular SVG images found on the page (typically larger vector graphics)")


class ColorCollection(BaseModel):
    """Model for color collections"""
    from_css: List[ColorInfo] = Field(default_factory=list, description="Colors extracted from CSS")
    from_images: List[ColorInfo] = Field(default_factory=list, description="Dominant colors extracted from images")


class ExtractorResponse(BaseModel):
    """Model for the complete extractor response"""
    url: str = Field(..., description="The URL that was analyzed")
    colors: ColorCollection = Field(default_factory=ColorCollection, description="Colors extracted from the page")
    fonts: List[FontInfo] = Field(default_factory=list, description="Fonts extracted from the page")
    assets: AssetCollection = Field(default_factory=AssetCollection, description="Assets extracted from the page")


class ErrorResponse(BaseModel):
    """Model for error responses"""
    error: str = Field(..., description="Error message")


class ExtractorResult(BaseModel):
    """Union model that can represent either a successful response or an error"""
    result: Union[ExtractorResponse, ErrorResponse] = Field(..., description="The extraction result or error")