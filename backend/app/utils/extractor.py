import traceback
import requests
from bs4 import BeautifulSoup
import re
import json
import extcolors
from io import BytesIO
from PIL import Image
import cssutils
import logging
import httpx
from urllib.parse import urljoin, urlparse, unquote
import webcolors
import asyncio
from playwright.async_api import (
    async_playwright,
    TimeoutError as PlaywrightTimeoutError,
)
import base64
from typing import Optional, Callable, Dict, Any
import html

# Suppress cssutils log messages
cssutils.log.setLevel(logging.CRITICAL)


class WebAssetExtractor:
    def __init__(
        self,
        url,
        progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ):
        self.url = url
        self.parsed_url = urlparse(url)
        self.base_url = f"{self.parsed_url.scheme}://{self.parsed_url.netloc}"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        self.soup = None
        self.content = None
        self.css_colors = []
        self.image_colors = []
        self.fonts = []
        self.assets = {
            "images": [],
            "videos": [],
            "scripts": [],
            "stylesheets": [],
            "icons": [],  # For SVG icons
            "svgs": [],  # For regular SVGs
        }
        self.page_resources = []
        self.progress_callback = progress_callback
        self.extraction_complete = False

    def _send_progress(self, stage: str, data: Dict[str, Any] = None):
        """Send progress update via callback if available"""
        if self.progress_callback:
            if data is None:
                data = {}
            self.progress_callback(stage, data)

    async def fetch_page(self):
        """Fetch the webpage content using Playwright to handle JavaScript rendering"""
        self._send_progress("fetching_page", {"url": self.url})

        try:
            async with async_playwright() as p:
                # Launch browser with more generous timeout settings
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent=self.headers["User-Agent"],
                )

                # Enable request interception to capture all loaded resources
                page = await context.new_page()

                # Track all resources loaded by the page
                async def on_response(response):
                    if response.ok:
                        content_type = response.headers.get("content-type", "")
                        url = response.url
                        if not url.startswith("data:"):
                            resource_type = response.request.resource_type
                            self.page_resources.append(
                                {
                                    "url": url,
                                    "type": resource_type,
                                    "contentType": content_type,
                                }
                            )

                            # Send progress update for important resources
                            if resource_type in ["image", "media", "stylesheet"]:
                                self._send_progress(
                                    "resource_loaded",
                                    {"type": resource_type, "url": url},
                                )

                page.on("response", on_response)

                # Try multiple page load strategies if one fails
                try:
                    # First attempt with networkidle and a reasonable timeout
                    self._send_progress("loading_page", {"strategy": "networkidle"})
                    await page.goto(self.url, wait_until="networkidle", timeout=45000)
                except PlaywrightTimeoutError:
                    traceback.print_exc()
                    # Fallback to domcontentloaded which is less strict
                    self._send_progress(
                        "loading_page",
                        {
                            "strategy": "domcontentloaded",
                            "note": "networkidle timed out",
                        },
                    )
                    try:
                        # Navigate with a more forgiving strategy
                        await page.goto(
                            self.url, wait_until="domcontentloaded", timeout=30000
                        )
                        # Wait a bit more for additional resources to load
                        await page.wait_for_timeout(5000)
                    except PlaywrightTimeoutError:
                        traceback.print_exc()
                        # Last resort: just load and wait a fixed time
                        self._send_progress(
                            "loading_page",
                            {"strategy": "load", "note": "domcontentloaded timed out"},
                        )
                        await page.goto(self.url, wait_until="load", timeout=20000)
                        await page.wait_for_timeout(3000)

                # Wait a bit more to ensure dynamic content is loaded
                self._send_progress("page_loaded", {"waiting_for_content": True})
                await page.wait_for_timeout(2000)

                # Get the page content after JavaScript execution
                self.content = await page.content()
                self.soup = BeautifulSoup(self.content, "lxml")
                self._send_progress(
                    "parsing_content", {"content_length": len(self.content)}
                )

                # Execute some JavaScript to find hidden resources
                self._send_progress("extracting_js_resources", {})
                resources_from_js = await page.evaluate(
                    """() => {
                    // Look for React props that might contain media URLs
                    const mediaUrls = [];
                    
                    // Function to extract URLs from text
                    const extractUrls = (text) => {
                        const urlRegex = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov))/gi;
                        return text.match(urlRegex) || [];
                    };
                    
                    // Scan all script tags for potential media URLs
                    document.querySelectorAll('script').forEach(script => {
                        if (script.textContent) {
                            const urls = extractUrls(script.textContent);
                            urls.forEach(url => mediaUrls.push(url));
                        }
                    });
                    
                    // Look for React components with media
                    if (window.__INITIAL_STATE__ || window.__PRELOADED_STATE__) {
                        const state = JSON.stringify(window.__INITIAL_STATE__ || window.__PRELOADED_STATE__);
                        const urls = extractUrls(state);
                        urls.forEach(url => mediaUrls.push(url));
                    }
                    
                    // Try to find video elements that might be added dynamically
                    const videoSources = [];
                    document.querySelectorAll('video').forEach(video => {
                        if (video.src) videoSources.push(video.src);
                        video.querySelectorAll('source').forEach(source => {
                            if (source.src) videoSources.push(source.src);
                        });
                    });
                    
                    return {
                        mediaUrls: [...new Set(mediaUrls)],
                        videoSources: [...new Set(videoSources)],
                        lazyImages: Array.from(document.querySelectorAll('[data-src], [data-lazy], [data-lazy-src], [data-original]'))
                            .map(img => ({
                                src: img.src,
                                dataSrc: img.dataset.src || img.dataset.lazy || img.dataset.lazySrc || img.dataset.original
                            }))
                            .filter(img => img.dataSrc)
                    };
                }"""
                )

                # Add the discovered resources
                for url in resources_from_js.get("mediaUrls", []):
                    if any(
                        url.endswith(ext)
                        for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]
                    ):
                        if url not in self.assets["images"]:
                            self.assets["images"].append(url)
                    elif any(
                        url.endswith(ext) for ext in [".mp4", ".webm", ".ogg", ".mov"]
                    ):
                        if url not in self.assets["videos"]:
                            self.assets["videos"].append(url)

                # Add video sources
                for url in resources_from_js.get("videoSources", []):
                    if url not in self.assets["videos"]:
                        self.assets["videos"].append(url)

                # Add lazy-loaded images
                for img_data in resources_from_js.get("lazyImages", []):
                    if img_data.get("dataSrc"):
                        full_url = self._normalize_url(img_data["dataSrc"])
                        if full_url and full_url not in self.assets["images"]:
                            self.assets["images"].append(full_url)

                # Close the browser
                await browser.close()
                self._send_progress("page_fetch_complete", {"status": "success"})
                return True

        except Exception as e:
            traceback.print_exc()

            error_message = str(e)
            self._send_progress("page_fetch_error", {"error": error_message})
            print(f"Error fetching page with Playwright: {error_message}")

            # Fallback to simple httpx request
            try:
                self._send_progress("fallback_request", {"method": "httpx"})
                async with httpx.AsyncClient(
                    follow_redirects=True, timeout=30.0
                ) as client:
                    response = await client.get(self.url, headers=self.headers)
                    response.raise_for_status()
                    self.content = response.text
                    self.soup = BeautifulSoup(self.content, "lxml")
                    self._send_progress("fallback_complete", {"status": "success"})
                    return True
            except Exception as inner_e:
                inner_error = str(inner_e)
                traceback.print_exc()
                self._send_progress("fallback_failed", {"error": inner_error})
                print(f"Fallback request also failed: {inner_error}")
                return False

    def _normalize_url(self, url):
        """Convert relative URLs to absolute URLs with improved handling"""
        if not url:
            return None
        if url.startswith("data:"):
            return url

        # Handle special cases
        url = url.strip()

        # Remove URL encoded characters
        url = unquote(url)

        # Handle protocol-relative URLs (//example.com/image.jpg)
        if url.startswith("//"):
            return f"{self.parsed_url.scheme}:{url}"

        # Regular URL joining
        full_url = urljoin(self.base_url, url)

        # Clean up any unnecessary query parameters that might affect caching
        parsed = urlparse(full_url)
        clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

        # Keep query parameters for dynamic assets
        if parsed.query and not any(
            clean_url.endswith(ext)
            for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
        ):
            clean_url += f"?{parsed.query}"

        return clean_url

    def _get_closest_color_name(self, rgb):
        """Get the closest color name for an RGB value"""
        try:
            hex_color = "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])
            color_name = webcolors.hex_to_name(hex_color)
            return {"name": color_name, "hex": hex_color, "rgb": rgb}
        except ValueError:
            min_distance = float("inf")
            closest_name = "Unknown"
            for name, hex in webcolors.CSS3_NAMES_TO_HEX.items():
                try:
                    css_rgb = webcolors.hex_to_rgb(hex)
                    distance = sum((abs(c1 - c2) for c1, c2 in zip(rgb, css_rgb)))
                    if distance < min_distance:
                        min_distance = distance
                        closest_name = name
                except ValueError:
                    continue
            hex_color = "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])
            return {"name": closest_name, "hex": hex_color, "rgb": rgb}

    def _clean_svg(self, svg_str: str) -> str:
        """Clean and format SVG content for better compatibility"""
        # Remove unnecessary whitespace and formatting
        svg_str = re.sub(r"\s+", " ", svg_str)
        svg_str = re.sub(r"> <", "><", svg_str)

        # Fix case sensitivity issues - convert viewbox to viewBox
        svg_str = re.sub(r"\bviewbox\s*=", "viewBox=", svg_str)

        # Find all viewBox attributes and their values
        viewbox_matches = re.findall(r'viewBox\s*=\s*["\']([^"\']+)["\']', svg_str)

        # If multiple viewBox attributes or invalid ones, fix them
        if viewbox_matches:
            # Remove all viewBox attributes
            svg_str = re.sub(r'viewBox\s*=\s*["\'][^"\']+["\']', "", svg_str)

            # Find the first valid viewBox (non-zero width and height)
            valid_viewbox = None
            for viewbox in viewbox_matches:
                parts = viewbox.split()
                if len(parts) == 4:
                    try:
                        x, y, width, height = [float(p) for p in parts]
                        # Check for valid dimensions (non-zero)
                        if width > 0 and height > 0:
                            valid_viewbox = viewbox
                            break
                    except (ValueError, IndexError):
                        continue

            # If no valid viewBox found, try to create one from width/height
            if not valid_viewbox:
                width_match = re.search(r'width\s*=\s*["\'](\d+(?:\.\d+)?)', svg_str)
                height_match = re.search(r'height\s*=\s*["\'](\d+(?:\.\d+)?)', svg_str)

                if width_match and height_match:
                    width = width_match.group(1)
                    height = height_match.group(1)
                    valid_viewbox = f"0 0 {width} {height}"
                else:
                    # Default viewBox for small icons
                    valid_viewbox = "0 0 24 24"

            # Add the valid viewBox back to the SVG
            svg_str = svg_str.replace("<svg ", f'<svg viewBox="{valid_viewbox}" ')
        else:
            # No viewBox found, add one based on width/height or default
            width_match = re.search(r'width\s*=\s*["\'](\d+(?:\.\d+)?)', svg_str)
            height_match = re.search(r'height\s*=\s*["\'](\d+(?:\.\d+)?)', svg_str)

            if width_match and height_match:
                width = width_match.group(1)
                height = height_match.group(1)
                svg_str = svg_str.replace(
                    "<svg ", f'<svg viewBox="0 0 {width} {height}" '
                )
            else:
                # Add default viewBox and dimensions
                svg_str = svg_str.replace("<svg ", '<svg viewBox="0 0 24 24" ')

        # Ensure SVG has proper namespace
        if not "xmlns=" in svg_str:
            svg_str = svg_str.replace(
                "<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '
            )

        # Add default width/height if missing
        if not "width=" in svg_str:
            width = re.search(
                r'viewBox\s*=\s*["\'][^"\']*\s+[^"\']*\s+([^"\']+)', svg_str
            )
            if width:
                svg_str = svg_str.replace("<svg ", f'<svg width="{width.group(1)}" ')
            else:
                svg_str = svg_str.replace("<svg ", '<svg width="24" ')

        if not "height=" in svg_str:
            height = re.search(
                r'viewBox\s*=\s*["\'][^"\']*\s+[^"\']*\s+[^"\']+\s+([^"\']+)', svg_str
            )
            if height:
                svg_str = svg_str.replace("<svg ", f'<svg height="{height.group(1)}" ')
            else:
                svg_str = svg_str.replace("<svg ", '<svg height="24" ')

        # Fix issue with SVG containing HTML entities
        svg_str = svg_str.replace("&nbsp;", " ")
        svg_str = re.sub(
            r"&([a-zA-Z]+);", lambda m: html.unescape(f"&{m.group(1)};"), svg_str
        )

        return svg_str

    def _svg_to_data_uri(self, svg_str: str) -> str:
        """Convert SVG string to a data URI with improved encoding and path handling"""
        try:
            # Clean the SVG first
            svg_str = self._clean_svg(svg_str)

            # Add default attributes if missing to improve compatibility
            if not "width" in svg_str and not "height" in svg_str:
                svg_str = svg_str.replace("<svg", '<svg width="24" height="24"')

            # Make sure paths have proper attributes
            svg_str = self._fix_svg_paths(svg_str)

            # Base64 encoding - better compatibility for all browsers
            encoded_svg = base64.b64encode(svg_str.encode("utf-8")).decode("utf-8")
            return f"data:image/svg+xml;base64,{encoded_svg}"
        except Exception as e:
            print(f"Error converting SVG to data URI: {e}")
            return ""

    def _fix_svg_paths(self, svg_str: str) -> str:
        """Ensure SVG paths have necessary attributes for proper rendering"""
        # Find paths without fill or stroke
        path_regex = r"<path([^>]*)>"
        paths = re.findall(path_regex, svg_str)

        for path_attrs in paths:
            if "fill" not in path_attrs and "stroke" not in path_attrs:
                # Add default fill to ensure path is visible
                new_path_attrs = path_attrs + ' fill="currentColor"'
                svg_str = svg_str.replace(
                    f"<path{path_attrs}>", f"<path{new_path_attrs}>"
                )

        # Also fix rect, circle, and polygon elements without fill
        for tag in ["rect", "circle", "ellipse", "polygon", "polyline"]:
            tag_regex = f"<{tag}([^>]*)>"
            elements = re.findall(tag_regex, svg_str)

            for elem_attrs in elements:
                if "fill" not in elem_attrs and "stroke" not in elem_attrs:
                    new_attrs = elem_attrs + ' fill="currentColor"'
                    svg_str = svg_str.replace(
                        f"<{tag}{elem_attrs}>", f"<{tag}{new_attrs}>"
                    )

        return svg_str

    def _is_svg_icon(self, svg_str: str) -> bool:
        """Determine if an SVG is likely an icon based on its attributes and content"""
        # Check for common icon indicators in the SVG string
        icon_indicators = ["icon", "logo", "glyph", "symbol", "button", "arrow", "menu"]
        if any(indicator in svg_str.lower() for indicator in icon_indicators):
            return True

        # Check if it has a small viewBox or width/height
        viewbox_match = re.search(
            r'viewBox=["\']0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)["\']', svg_str
        )
        if viewbox_match:
            width = float(viewbox_match.group(1))
            height = float(viewbox_match.group(2))
            # If smaller than 100x100, likely an icon
            if width <= 100 and height <= 100:
                return True

        # Check explicit width/height attributes
        width_match = re.search(r'width=["\'](\d+(?:\.\d+)?)', svg_str)
        height_match = re.search(r'height=["\'](\d+(?:\.\d+)?)', svg_str)
        if width_match and height_match:
            width = float(width_match.group(1))
            height = float(height_match.group(1))
            # If smaller than 100x100, likely an icon
            if width <= 100 and height <= 100:
                return True

        # Check if it has a single path and simple structure (common for icons)
        path_count = svg_str.count("<path")
        if path_count > 0 and path_count < 10 and svg_str.count("<") < 30:
            return True

        # Check for specific attributes commonly used in icons
        if "stroke-width=" in svg_str and 'fill="none"' in svg_str:
            return True

        return False

    def _prepare_svg_for_frontend(self, svg_str: str) -> str:
        """Prepare SVG content for frontend display (without base64 encoding)"""
        try:
            # Clean and fix paths in the SVG
            svg_str = self._clean_svg(svg_str)
            svg_str = self._fix_svg_paths(svg_str)

            return svg_str
        except Exception as e:
            print(f"Error preparing SVG for frontend: {e}")
            return ""

    async def extract_css_colors(self):
        """Extract colors from CSS files and inline styles"""
        self._send_progress("extracting_colors", {"stage": "css"})
        # Dictionary to track color frequency
        color_frequency = {}

        # Get colors from style tags
        for style in self.soup.find_all("style"):
            if style.string:
                css = cssutils.parseString(style.string)
                for rule in css:
                    if rule.type == rule.STYLE_RULE:
                        for property in rule.style:
                            if (
                                "color" in property.name
                                or "background" in property.name
                            ):
                                # Extract colors from the property value
                                color_values = re.findall(
                                    r"#(?:[0-9a-fA-F]{3}){1,2}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)",
                                    property.value,
                                )
                                for color in color_values:
                                    if color in color_frequency:
                                        color_frequency[color] += 1
                                    else:
                                        color_frequency[color] = 1

        # Get colors from computed styles (React and dynamically generated CSS)
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800}
                )
                page = await context.new_page()
                await page.goto(self.url, wait_until="networkidle")

                # Extract colors from computed styles of elements
                colors_from_computed = await page.evaluate(
                    """() => {
                    const colors = new Set();
                    const elements = document.querySelectorAll('*');
                    
                    elements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        const colorProps = [
                            'color', 'backgroundColor', 'borderColor', 
                            'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'
                        ];
                        
                        colorProps.forEach(prop => {
                            const value = style[prop];
                            if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
                                colors.add(value);
                            }
                        });
                    });
                    
                    return Array.from(colors);
                }"""
                )

                for color in colors_from_computed:
                    if color in color_frequency:
                        color_frequency[color] += 1
                    else:
                        color_frequency[color] = 1

                await browser.close()
        except Exception as e:
            traceback.print_exc()
            print(f"Error extracting computed styles: {str(e)}")

        # Process the colors
        processed_colors = []
        for color, count in color_frequency.items():
            if color.startswith("#"):
                # Convert hex to RGB
                if len(color) == 4:  # Short form (#RGB)
                    r = int(color[1] + color[1], 16)
                    g = int(color[2] + color[2], 16)
                    b = int(color[3] + color[3], 16)
                else:  # Normal form (#RRGGBB)
                    r = int(color[1:3], 16)
                    g = int(color[3:5], 16)
                    b = int(color[5:7], 16)
                color_info = self._get_closest_color_name((r, g, b))
                color_info["count"] = count
                color_info["percentage"] = (
                    None  # CSS colors don't have a meaningful percentage
                )
                processed_colors.append(color_info)
            elif color.startswith("rgb(") or color.startswith("rgba("):
                # Extract RGB values
                rgb_values = re.findall(r"\d+", color)[:3]
                if len(rgb_values) == 3:
                    rgb = tuple(int(v) for v in rgb_values)
                    color_info = self._get_closest_color_name(rgb)
                    color_info["count"] = count
                    color_info["percentage"] = None
                    processed_colors.append(color_info)

        # Remove duplicates and sort by frequency (count)
        unique_colors = []
        seen_hex = set()
        for color in processed_colors:
            if color["hex"] not in seen_hex:
                seen_hex.add(color["hex"])
                unique_colors.append(color)

        # Sort colors by count (frequency) in descending order
        self.css_colors = sorted(unique_colors, key=lambda x: x["count"], reverse=True)
        self._send_progress(
            "colors_extracted", {"count": len(self.css_colors), "source": "css"}
        )

    async def extract_dominant_image_colors(self, max_images=5):
        """Extract dominant colors from images"""
        image_urls = self.assets["images"][
            :max_images
        ]  # Limit to avoid processing too many images
        self._send_progress(
            "extracting_colors", {"stage": "images", "count": len(image_urls)}
        )

        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for img_url in image_urls:
                try:
                    if not img_url.startswith(("http://", "https://")):
                        img_url = urljoin(self.base_url, img_url)

                    if img_url.startswith("data:"):
                        continue  # Skip data URLs

                    response = await client.get(
                        img_url, headers=self.headers, timeout=10.0
                    )
                    if response.status_code == 200:
                        img = Image.open(BytesIO(response.content))

                        # Resize image to speed up processing
                        max_size = (150, 150)
                        img.thumbnail(max_size, Image.LANCZOS)

                        # Convert to RGB if needed (handles PNG with transparency)
                        if img.mode != "RGB":
                            img = img.convert("RGB")

                        # Extract colors with a minimum area of 0.5%
                        colors = extcolors.extract_from_image(
                            img, tolerance=12, limit=5
                        )
                        total_pixels = img.width * img.height

                        for color, count in colors[0]:
                            # Skip colors that are too common (likely white/black backgrounds)
                            color_info = self._get_closest_color_name(color)
                            color_info["count"] = count
                            color_info["percentage"] = round(
                                (count / total_pixels) * 100, 2
                            )
                            color_info["source"] = img_url

                            # Skip near-white or near-black colors
                            is_near_white = all(c > 240 for c in color)
                            is_near_black = all(c < 15 for c in color)

                            if (
                                not (is_near_white or is_near_black)
                                or color_info["percentage"] > 80
                            ):
                                self.image_colors.append(color_info)
                except Exception as e:
                    # traceback.print_exc()
                    print(f"Error processing image {img_url}: {str(e)}")
                    continue

        # Sort the image colors by percentage/count in descending order
        self.image_colors = sorted(
            self.image_colors,
            key=lambda x: x["percentage"] if x["percentage"] is not None else 0,
            reverse=True,
        )
        self._send_progress(
            "colors_extracted", {"count": len(self.image_colors), "source": "images"}
        )

    async def extract_fonts(self):
        """Extract fonts from the webpage"""
        self._send_progress("extracting_fonts", {})
        # Check for Google Fonts
        google_fonts_links = self.soup.find_all(
            "link", href=re.compile("fonts.googleapis.com")
        )
        for link in google_fonts_links:
            href = link.get("href", "")
            # Extract font family names from Google Fonts URL
            font_families = re.findall(r"family=([^&:]+)", href)
            for family in font_families:
                family_name = family.replace("+", " ")
                if {
                    "name": family_name,
                    "type": "Google Font",
                    "url": href,
                } not in self.fonts:
                    self.fonts.append(
                        {"name": family_name, "type": "Google Font", "url": href}
                    )

        # Check for Adobe Fonts (Typekit)
        typekit_links = self.soup.find_all(
            "link", href=re.compile("use.typekit.net|use.edgefonts.net")
        )
        for link in typekit_links:
            href = link.get("href", "")
            if {"name": "Adobe Font", "type": "Typekit", "url": href} not in self.fonts:
                self.fonts.append(
                    {"name": "Adobe Font", "type": "Typekit", "url": href}
                )

        # Extract @font-face declarations from style tags
        for style in self.soup.find_all("style"):
            if style.string:
                font_face_blocks = re.findall(r"@font-face\s*{[^}]+}", style.string)
                for block in font_face_blocks:
                    font_family = re.search(
                        r'font-family:\s*[\'"]?([^\'";}]+)[\'"]?', block
                    )
                    font_url = re.search(
                        r'src:\s*url\([\'"]?([^\'"()]+)[\'"]?\)', block
                    )

                    if font_family:
                        family_name = font_family.group(1).strip()
                        url = font_url.group(1) if font_url else None
                        if url:
                            url = self._normalize_url(url)

                        font_info = {
                            "name": family_name,
                            "type": "@font-face",
                            "url": url,
                        }
                        if font_info not in self.fonts:
                            self.fonts.append(font_info)

        # Extract fonts from inline styles
        all_elements = self.soup.find_all(style=True)
        for element in all_elements:
            style_attr = element.get("style", "")
            font_family = re.search(r"font-family:\s*([^;]+)", style_attr)
            if font_family:
                families = [
                    f.strip().strip("\"'") for f in font_family.group(1).split(",")
                ]
                for family in families:
                    if family.lower() not in [
                        "serif",
                        "sans-serif",
                        "monospace",
                        "cursive",
                        "fantasy",
                    ]:
                        font_info = {"name": family, "type": "inline", "url": None}
                        if font_info not in self.fonts:
                            self.fonts.append(font_info)

        # Try to extract fonts using Playwright's computed styles
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800}
                )
                page = await context.new_page()
                await page.goto(self.url, wait_until="networkidle")

                # Get computed font families from all elements
                fonts_from_computed = await page.evaluate(
                    """() => {
                    const fontFamilies = new Set();
                    document.querySelectorAll('*').forEach(el => {
                        const fontFamily = window.getComputedStyle(el).fontFamily;
                        if (fontFamily) {
                            fontFamilies.add(fontFamily);
                        }
                    });
                    
                    // Parse the font families
                    const parsedFonts = [];
                    fontFamilies.forEach(family => {
                        const fonts = family.split(',').map(f => f.trim().replace(/["']/g, ''));
                        fonts.forEach(font => {
                            if (!['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'].includes(font.toLowerCase())) {
                                parsedFonts.push(font);
                            }
                        });
                    });
                    
                    return [...new Set(parsedFonts)]; // Return unique fonts
                }"""
                )

                for font in fonts_from_computed:
                    font_info = {"name": font, "type": "computed", "url": None}
                    if not any(f["name"] == font for f in self.fonts):
                        self.fonts.append(font_info)

                await browser.close()
        except Exception as e:
            traceback.print_exc()
            print(f"Error extracting fonts with Playwright: {str(e)}")

        # Get fonts from external CSS files
        stylesheets = self.assets["stylesheets"]
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for css_url in stylesheets:
                try:
                    if not css_url.startswith(("http://", "https://")):
                        css_url = urljoin(self.base_url, css_url)

                    if css_url.startswith("data:"):
                        continue

                    response = await client.get(
                        css_url, headers=self.headers, timeout=10.0
                    )
                    if response.status_code == 200:
                        # Extract @font-face declarations
                        font_face_blocks = re.findall(
                            r"@font-face\s*{[^}]+}", response.text
                        )
                        for block in font_face_blocks:
                            font_family = re.search(
                                r'font-family:\s*[\'"]?([^\'";}]+)[\'"]?', block
                            )
                            font_url = re.search(
                                r'src:\s*url\([\'"]?([^\'"()]+)[\'"]?\)', block
                            )

                            if font_family:
                                family_name = font_family.group(1).strip()
                                url = font_url.group(1) if font_url else None
                                if url:
                                    url = self._normalize_url(url)

                                font_info = {
                                    "name": family_name,
                                    "type": "@font-face (external)",
                                    "url": url,
                                }
                                if font_info not in self.fonts:
                                    self.fonts.append(font_info)

                        # Extract font-family properties
                        font_families = re.findall(
                            r"font-family:\s*([^;]+)", response.text
                        )
                        for families in font_families:
                            for family in [
                                f.strip().strip("\"'") for f in families.split(",")
                            ]:
                                if family.lower() not in [
                                    "serif",
                                    "sans-serif",
                                    "monospace",
                                    "cursive",
                                    "fantasy",
                                ]:
                                    font_info = {
                                        "name": family,
                                        "type": "CSS",
                                        "url": css_url,
                                    }
                                    if font_info not in self.fonts:
                                        self.fonts.append(font_info)
                except Exception as e:
                    traceback.print_exc()
                    print(f"Error processing CSS file {css_url}: {str(e)}")
                    continue

        self._send_progress("fonts_extracted", {"count": len(self.fonts)})

    async def extract_assets(self):
        """Extract all assets from the webpage with improved detection"""
        self._send_progress("extracting_assets", {"stage": "starting"})
        print("Extracting assets")

        # Process resources captured during page load
        self._send_progress("processing_resources", {"count": len(self.page_resources)})

        for resource in self.page_resources:
            url = resource["url"]
            if resource["type"] == "image" or any(
                ext in resource["contentType"]
                for ext in ["image/", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
            ):
                if url not in self.assets["images"]:
                    self.assets["images"].append(url)
            elif resource["type"] == "media" or any(
                ext in resource["contentType"] for ext in ["video/", "audio/"]
            ):
                if url not in self.assets["videos"]:
                    self.assets["videos"].append(url)
            elif (
                "javascript" in resource["contentType"]
                and url not in self.assets["scripts"]
            ):
                self.assets["scripts"].append(url)
            elif (
                "css" in resource["contentType"]
                and url not in self.assets["stylesheets"]
            ):
                self.assets["stylesheets"].append(url)

        # Extract image URLs - standard img tags
        for img in self.soup.find_all("img", src=True):
            img_url = self._normalize_url(img.get("src"))
            if img_url and img_url not in self.assets["images"]:
                self.assets["images"].append(img_url)

            # Check for srcset attribute
            if img.has_attr("srcset"):
                srcset = img["srcset"]
                urls = re.findall(r"([^\s,]+)(?:\s+\d+[wx])?(?:,|$)", srcset)
                for src_url in urls:
                    full_url = self._normalize_url(src_url)
                    if full_url and full_url not in self.assets["images"]:
                        self.assets["images"].append(full_url)

        # Check for lazy-loaded images
        for img in self.soup.find_all(["img", "div", "span"]):
            for attr in [
                "data-src",
                "data-original",
                "data-lazy",
                "data-srcset",
                "data-bg",
            ]:
                if img.has_attr(attr):
                    attr_value = img[attr]
                    if attr == "data-srcset":
                        # Handle srcset format
                        urls = re.findall(
                            r"([^\s,]+)(?:\s+\d+[wx])?(?:,|$)", attr_value
                        )
                        for url in urls:
                            full_url = self._normalize_url(url)
                            if full_url and full_url not in self.assets["images"]:
                                self.assets["images"].append(full_url)
                    else:
                        full_url = self._normalize_url(attr_value)
                        if full_url and full_url not in self.assets["images"]:
                            self.assets["images"].append(full_url)

        # Extract inline SVG
        for svg in self.soup.find_all("svg"):
            svg_str = str(svg)
            if svg_str:
                # Convert inline SVG to data URI
                svg_data = base64.b64encode(svg_str.encode("utf-8")).decode("utf-8")
                data_uri = f"data:image/svg+xml;base64,{svg_data}"
                if data_uri not in self.assets["images"]:
                    self.assets["images"].append(data_uri)

        # Extract inline SVG elements more thoroughly
        svg_elements = self.soup.find_all("svg")
        for svg in svg_elements:
            try:
                svg_str = str(svg)
                if svg_str:
                    # Debug info
                    print(f"Processing SVG: {svg_str[:100]}...")

                    # Clean and prepare the SVG for frontend
                    processed_svg = self._prepare_svg_for_frontend(svg_str)
                    if not processed_svg:
                        continue

                    # Determine if it's an icon or regular SVG
                    is_icon = self._is_svg_icon(svg_str)

                    if is_icon:
                        print(f"Identified as icon: {processed_svg[:50]}...")
                        if processed_svg not in self.assets["icons"]:
                            self.assets["icons"].append(processed_svg)
                    else:
                        print(f"Identified as regular SVG: {processed_svg[:50]}...")
                        if processed_svg not in self.assets["svgs"]:
                            self.assets["svgs"].append(processed_svg)
            except Exception as e:
                print(f"Error processing inline SVG: {str(e)}")

        # Also check for SVG content in HTML attributes like aria-label, title, etc.
        for elem in self.soup.find_all(attrs={"aria-label": True}):
            aria_label = elem.get("aria-label", "")
            if aria_label.lower() in ["icon", "logo", "svg icon"]:
                if elem.name == "div" and elem.get("class"):
                    # This might be an SVG icon wrapped in a div
                    try:
                        # Try to get innerHTML
                        inner_html = str(elem)
                        if "<svg" in inner_html:
                            svg_match = re.search(
                                r"(<svg[^>]*>.*?</svg>)", inner_html, re.DOTALL
                            )
                            if svg_match:
                                svg_str = svg_match.group(1)
                                processed_svg = self._prepare_svg_for_frontend(svg_str)
                                if (
                                    processed_svg
                                    and processed_svg not in self.assets["icons"]
                                ):
                                    self.assets["icons"].append(processed_svg)
                    except Exception as e:
                        print(f"Error processing potential SVG in div: {str(e)}")

        # Look for SVG references in <img> and <object> tags
        for tag in self.soup.find_all(["img", "object"]):
            src = tag.get("src") or tag.get("data")
            if src and src.endswith(".svg"):
                try:
                    svg_url = self._normalize_url(src)
                    if svg_url:
                        # For now, add to SVGs list - we'll process it later
                        if svg_url not in self.assets["svgs"]:
                            self.assets["svgs"].append(svg_url)
                except Exception as e:
                    print(f"Error processing SVG reference: {str(e)}")

        # Process external SVG references
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for svg_url in list(
                self.assets["svgs"]
            ):  # Create a copy to avoid modification during iteration
                if svg_url.startswith("<svg"):
                    continue  # Skip SVG markup that's already processed

                try:
                    if svg_url.endswith(".svg"):
                        response = await client.get(
                            svg_url, headers=self.headers, timeout=10.0
                        )
                        if response.status_code == 200:
                            svg_content = response.text
                            # Remove the URL and add the processed SVG
                            self.assets["svgs"].remove(svg_url)

                            # Process SVG content
                            processed_svg = self._prepare_svg_for_frontend(svg_content)

                            # Determine if it's an icon or regular SVG
                            is_icon = self._is_svg_icon(svg_content)
                            if is_icon:
                                if processed_svg not in self.assets["icons"]:
                                    self.assets["icons"].append(processed_svg)
                            else:
                                if processed_svg not in self.assets["svgs"]:
                                    self.assets["svgs"].append(processed_svg)
                except Exception as e:
                    print(f"Error fetching external SVG {svg_url}: {str(e)}")

        # Extract video sources - standard video tags
        for video in self.soup.find_all("video"):
            # Check video src attribute
            if video.has_attr("src"):
                video_url = self._normalize_url(video.get("src"))
                if video_url and video_url not in self.assets["videos"]:
                    self.assets["videos"].append(video_url)

            # Check source tags inside video
            for source in video.find_all("source", src=True):
                source_url = self._normalize_url(source.get("src"))
                if source_url and source_url not in self.assets["videos"]:
                    self.assets["videos"].append(source_url)

            # Check poster attribute (thumbnail)
            if video.has_attr("poster"):
                poster_url = self._normalize_url(video.get("poster"))
                if poster_url and poster_url not in self.assets["images"]:
                    self.assets["images"].append(poster_url)

        # Check for video in iframes (YouTube, Vimeo, etc.)
        for iframe in self.soup.find_all("iframe", src=True):
            iframe_src = iframe.get("src", "")
            video_platforms = [
                "youtube.com/embed/",
                "player.vimeo.com",
                "dailymotion.com/embed",
                "facebook.com/plugins/video",
                "instagram.com/tv/",
            ]

            if any(platform in iframe_src for platform in video_platforms):
                if iframe_src not in self.assets["videos"]:
                    self.assets["videos"].append(iframe_src)

        # Look for custom video players
        video_players = self.soup.find_all(
            ["div", "span"],
            class_=lambda c: c
            and any(
                cls in c
                for cls in [
                    "video-player",
                    "video-container",
                    "player",
                    "jwplayer",
                    "video-js",
                ]
            ),
        )

        for player in video_players:
            # Look for data attributes that might contain video URLs
            for attr in player.attrs:
                if attr.startswith("data-") and isinstance(player[attr], str):
                    value = player[attr]
                    if any(ext in value for ext in [".mp4", ".webm", ".ogg", ".mov"]):
                        video_url = self._normalize_url(value)
                        if video_url and video_url not in self.assets["videos"]:
                            self.assets["videos"].append(video_url)

        # Extract JavaScript files
        for script in self.soup.find_all("script", src=True):
            script_url = self._normalize_url(script.get("src"))
            if script_url and script_url not in self.assets["scripts"]:
                self.assets["scripts"].append(script_url)

        # Extract CSS files
        for link in self.soup.find_all("link", rel="stylesheet"):
            if link.has_attr("href"):
                css_url = self._normalize_url(link.get("href"))
                if css_url and css_url not in self.assets["stylesheets"]:
                    self.assets["stylesheets"].append(css_url)

        # Look for background images in inline styles - improved detection
        for elem in self.soup.find_all(style=True):
            style = elem.get("style", "")
            urls = re.findall(
                r'background(?:-image)?:\s*url\([\'"]?([^\'"()]+)[\'"]?\)', style
            )
            for url in urls:
                full_url = self._normalize_url(url)
                if full_url and full_url not in self.assets["images"]:
                    self.assets["images"].append(full_url)

        # Look for backgroundImage in style attribute (React style) - Fixed to handle None values
        try:
            # Safer implementation that handles None values properly
            for elem in self.soup.find_all():
                for attr_name, attr_value in elem.attrs.items():
                    if (
                        "style" in attr_name
                        and attr_value
                        and isinstance(attr_value, str)
                    ):
                        if (
                            "backgroundImage" in attr_value
                            or "background-image" in attr_value
                        ):
                            urls = re.findall(
                                r'url\([\'"]?([^\'"()]+)[\'"]?\)', attr_value
                            )
                            for url in urls:
                                full_url = self._normalize_url(url)
                                if full_url and full_url not in self.assets["images"]:
                                    self.assets["images"].append(full_url)
        except Exception as e:
            traceback.print_exc()
            print(f"Error extracting background images from style attributes: {str(e)}")

        # Additional search for React inline styles with object notation
        try:
            if self.soup:
                scripts = self.soup.find_all("script")
                for script in scripts:
                    if script.string:
                        # Look for image URLs in background/backgroundImage style objects
                        bg_urls = re.findall(
                            r'[\'"]?(?:background|backgroundImage)[\'"]?\s*:\s*[\'"]url\([\'"]?([^\'"()]+)[\'"]?\)[\'"]',
                            script.string,
                        )
                        for url in bg_urls:
                            full_url = self._normalize_url(url)
                            if full_url and full_url not in self.assets["images"]:
                                self.assets["images"].append(full_url)
        except Exception as e:
            traceback.print_exc()
            print(f"Error extracting background images from scripts: {str(e)}")

        print("Assets extraction complete.")

        self._send_progress(
            "assets_extracted",
            {
                "images": len(self.assets["images"]),
                "videos": len(self.assets["videos"]),
                "scripts": len(self.assets["scripts"]),
                "stylesheets": len(self.assets["stylesheets"]),
                "icons": len(self.assets["icons"]),
                "svgs": len(self.assets["svgs"]),
            },
        )

    async def extract_all(self):
        """Extract all information from the webpage"""
        success = await self.fetch_page()
        if not success:
            self._send_progress(
                "extraction_failed", {"error": "Failed to fetch the webpage"}
            )
            return {"error": "Failed to fetch the webpage"}

        print("Page fetched successfully, starting extraction...")

        await self.extract_assets()

        # Process data in parallel for better performance
        await asyncio.gather(
            self.extract_css_colors(),
            # self.extract_dominant_image_colors(),
            self.extract_fonts(),
        )

        # Mark extraction as complete
        self.extraction_complete = True
        self._send_progress("extraction_complete", {})

        return {
            "url": self.url,
            "colors": {"from_css": self.css_colors, "from_images": self.image_colors},
            "fonts": self.fonts,
            "assets": self.assets,
        }


async def extract_from_url(url):
    """Utility function to extract assets from a URL"""
    extractor = WebAssetExtractor(url)
    return await extractor.extract_all()


async def stream_extraction_from_url(url, progress_callback):
    """Utility function to extract assets from a URL with progress updates"""
    extractor = WebAssetExtractor(url, progress_callback)
    return await extractor.extract_all()
