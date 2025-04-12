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
from urllib.parse import urljoin, urlparse
import webcolors

# Suppress cssutils log messages
cssutils.log.setLevel(logging.CRITICAL)

class WebAssetExtractor:
    def __init__(self, url):
        self.url = url
        self.parsed_url = urlparse(url)
        self.base_url = f"{self.parsed_url.scheme}://{self.parsed_url.netloc}"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.soup = None
        self.content = None
        self.css_colors = []
        self.image_colors = []
        self.fonts = []
        self.assets = {
            'images': [],
            'videos': [],
            'scripts': [],
            'stylesheets': []
        }

    async def fetch_page(self):
        """Fetch the webpage content"""
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
                response = await client.get(self.url, headers=self.headers)
                response.raise_for_status()
                self.content = response.text
                self.soup = BeautifulSoup(self.content, 'lxml')
                return True
        except (httpx.HTTPError, httpx.TimeoutException, httpx.ConnectError) as e:
            print(f"Error fetching page: {str(e)}")
            return False

    def _normalize_url(self, url):
        """Convert relative URLs to absolute URLs"""
        if not url:
            return None
        if url.startswith('data:'):
            return url
        return urljoin(self.base_url, url)

    def _get_closest_color_name(self, rgb):
        """Get the closest color name for an RGB value"""
        try:
            hex_color = "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])
            color_name = webcolors.hex_to_name(hex_color)
            return {"name": color_name, "hex": hex_color, "rgb": rgb}
        except ValueError:
            min_distance = float('inf')
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

    async def extract_css_colors(self):
        """Extract colors from CSS files and inline styles"""
        # Get colors from style tags
        for style in self.soup.find_all('style'):
            if style.string:
                css = cssutils.parseString(style.string)
                for rule in css:
                    if rule.type == rule.STYLE_RULE:
                        for property in rule.style:
                            if 'color' in property.name or 'background' in property.name:
                                # Extract colors from the property value
                                color_values = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)', property.value)
                                for color in color_values:
                                    if color not in self.css_colors:
                                        self.css_colors.append(color)
        
        # Get colors from external CSS files
        stylesheets = self.assets['stylesheets']
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for css_url in stylesheets:
                try:
                    if not css_url.startswith(('http://', 'https://', 'data:')):
                        css_url = urljoin(self.base_url, css_url)
                    
                    if css_url.startswith('data:'):
                        continue
                        
                    response = await client.get(css_url, headers=self.headers, timeout=10.0)
                    if response.status_code == 200:
                        css = cssutils.parseString(response.text)
                        for rule in css:
                            if hasattr(rule, 'style'):
                                for property in rule.style:
                                    if 'color' in property.name or 'background' in property.name:
                                        color_values = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)', property.value)
                                        for color in color_values:
                                            if color not in self.css_colors:
                                                self.css_colors.append(color)
                except Exception as e:
                    print(f"Error processing CSS file {css_url}: {str(e)}")
                    continue
        
        # Process the colors
        processed_colors = []
        for color in self.css_colors:
            if color.startswith('#'):
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
                processed_colors.append(color_info)
            elif color.startswith('rgb(') or color.startswith('rgba('):
                # Extract RGB values
                rgb_values = re.findall(r'\d+', color)[:3]
                if len(rgb_values) == 3:
                    rgb = tuple(int(v) for v in rgb_values)
                    color_info = self._get_closest_color_name(rgb)
                    processed_colors.append(color_info)
        
        # Remove duplicates
        unique_colors = []
        seen_hex = set()
        for color in processed_colors:
            if color['hex'] not in seen_hex:
                seen_hex.add(color['hex'])
                unique_colors.append(color)
        
        self.css_colors = unique_colors

    async def extract_dominant_image_colors(self, max_images=5):
        """Extract dominant colors from images"""
        image_urls = self.assets['images'][:max_images]  # Limit to avoid processing too many images
        
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for img_url in image_urls:
                try:
                    if not img_url.startswith(('http://', 'https://')):
                        img_url = urljoin(self.base_url, img_url)
                    
                    if img_url.startswith('data:'):
                        continue  # Skip data URLs
                        
                    response = await client.get(img_url, headers=self.headers, timeout=10.0)
                    if response.status_code == 200:
                        img = Image.open(BytesIO(response.content))
                        # Resize image to speed up processing
                        img = img.resize((150, 150), Image.LANCZOS)
                        # Extract colors with a minimum area of 0.5%
                        colors = extcolors.extract_from_image(img, tolerance=12, limit=5)
                        for color, count in colors[0]:
                            color_info = self._get_closest_color_name(color)
                            color_info["count"] = count
                            color_info["percentage"] = round((count / (150 * 150)) * 100, 2)
                            color_info["source"] = img_url
                            self.image_colors.append(color_info)
                except Exception as e:
                    print(f"Error processing image {img_url}: {str(e)}")
                    continue

    async def extract_fonts(self):
        """Extract fonts from the webpage"""
        # Check for Google Fonts
        google_fonts_links = self.soup.find_all('link', href=re.compile('fonts.googleapis.com'))
        for link in google_fonts_links:
            href = link.get('href', '')
            # Extract font family names from Google Fonts URL
            font_families = re.findall(r'family=([^&:]+)', href)
            for family in font_families:
                family_name = family.replace('+', ' ')
                if {'name': family_name, 'type': 'Google Font'} not in self.fonts:
                    self.fonts.append({'name': family_name, 'type': 'Google Font'})

        # Extract @font-face declarations from style tags
        for style in self.soup.find_all('style'):
            if style.string:
                font_face_blocks = re.findall(r'@font-face\s*{[^}]+}', style.string)
                for block in font_face_blocks:
                    font_family = re.search(r'font-family:\s*[\'"]?([^\'";}]+)[\'"]?', block)
                    if font_family:
                        family_name = font_family.group(1).strip()
                        if {'name': family_name, 'type': '@font-face'} not in self.fonts:
                            self.fonts.append({'name': family_name, 'type': '@font-face'})

        # Extract fonts from inline styles
        all_elements = self.soup.find_all(style=True)
        for element in all_elements:
            style_attr = element.get('style', '')
            font_family = re.search(r'font-family:\s*([^;]+)', style_attr)
            if font_family:
                families = [f.strip().strip('"\'') for f in font_family.group(1).split(',')]
                for family in families:
                    if family.lower() not in ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'] and {'name': family, 'type': 'inline'} not in self.fonts:
                        self.fonts.append({'name': family, 'type': 'inline'})

        # Get fonts from external CSS files
        stylesheets = self.assets['stylesheets']
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            for css_url in stylesheets:
                try:
                    if not css_url.startswith(('http://', 'https://')):
                        css_url = urljoin(self.base_url, css_url)
                    
                    if css_url.startswith('data:'):
                        continue
                        
                    response = await client.get(css_url, headers=self.headers, timeout=10.0)
                    if response.status_code == 200:
                        # Extract @font-face declarations
                        font_face_blocks = re.findall(r'@font-face\s*{[^}]+}', response.text)
                        for block in font_face_blocks:
                            font_family = re.search(r'font-family:\s*[\'"]?([^\'";}]+)[\'"]?', block)
                            if font_family:
                                family_name = font_family.group(1).strip()
                                if {'name': family_name, 'type': '@font-face (external)'} not in self.fonts:
                                    self.fonts.append({'name': family_name, 'type': '@font-face (external)'})
                                    
                        # Extract font-family properties
                        font_families = re.findall(r'font-family:\s*([^;]+)', response.text)
                        for families in font_families:
                            for family in [f.strip().strip('"\'') for f in families.split(',')]:
                                if family.lower() not in ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'] and {'name': family, 'type': 'CSS'} not in self.fonts:
                                    self.fonts.append({'name': family, 'type': 'CSS'})
                except Exception as e:
                    print(f"Error processing CSS file {css_url}: {str(e)}")
                    continue

    async def extract_assets(self):
        """Extract all assets from the webpage"""
        # Extract image URLs
        for img in self.soup.find_all('img', src=True):
            img_url = self._normalize_url(img.get('src'))
            if img_url and img_url not in self.assets['images']:
                self.assets['images'].append(img_url)
        
        # Extract video sources
        for video in self.soup.find_all('video'):
            # Check video src attribute
            if video.has_attr('src'):
                video_url = self._normalize_url(video.get('src'))
                if video_url and video_url not in self.assets['videos']:
                    self.assets['videos'].append(video_url)
            
            # Check source tags inside video
            for source in video.find_all('source', src=True):
                source_url = self._normalize_url(source.get('src'))
                if source_url and source_url not in self.assets['videos']:
                    self.assets['videos'].append(source_url)
        
        # Extract JavaScript files
        for script in self.soup.find_all('script', src=True):
            script_url = self._normalize_url(script.get('src'))
            if script_url and script_url not in self.assets['scripts']:
                self.assets['scripts'].append(script_url)
        
        # Extract CSS files
        for link in self.soup.find_all('link', rel='stylesheet'):
            if link.has_attr('href'):
                css_url = self._normalize_url(link.get('href'))
                if css_url and css_url not in self.assets['stylesheets']:
                    self.assets['stylesheets'].append(css_url)
        
        # Look for background images in inline styles
        for elem in self.soup.find_all(style=True):
            style = elem.get('style')
            urls = re.findall(r'url\([\'"]?([^\'"()]+)[\'"]?\)', style)
            for url in urls:
                full_url = self._normalize_url(url)
                if full_url and full_url not in self.assets['images']:
                    self.assets['images'].append(full_url)

    async def extract_all(self):
        """Extract all information from the webpage"""
        success = await self.fetch_page()
        if not success:
            return {
                'error': 'Failed to fetch the webpage'
            }
        
        await self.extract_assets()
        await self.extract_css_colors()
        await self.extract_dominant_image_colors()
        await self.extract_fonts()
        
        return {
            'url': self.url,
            'colors': {
                'from_css': self.css_colors,
                'from_images': self.image_colors
            },
            'fonts': self.fonts,
            'assets': self.assets
        }

async def extract_from_url(url):
    """Utility function to extract assets from a URL"""
    extractor = WebAssetExtractor(url)
    return await extractor.extract_all()