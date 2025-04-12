export interface ColorInfo {
  name: string;
  hex: string;
  rgb: number[];
  count?: number;
  percentage?: number;
  source?: string;
}

export interface FontInfo {
  name: string;
  type: string;
}

export interface AssetCollection {
  images: string[];
  videos: string[];
  scripts: string[];
  stylesheets: string[];
}

export interface ColorCollection {
  from_css: ColorInfo[];
  from_images: ColorInfo[];
}

export interface ExtractorResponse {
  url: string;
  colors: ColorCollection;
  fonts: FontInfo[];
  assets: AssetCollection;
}

export interface ErrorResponse {
  error: string;
}

const API_URL = 'http://localhost:8000';

export async function extractFromUrl(url: string): Promise<ExtractorResponse> {
  try {
    console.log('Sending request to extract assets from:', url);
    
    const response = await fetch(`${API_URL}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    
    // Log response for debugging
    console.log('Response received:', data);

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Failed to extract assets');
    }

    return data as ExtractorResponse;
  } catch (error) {
    console.error('Error extracting assets:', error);
    throw error;
  }
}

export function getGoogleFontUrl(fontName: string): string {
  return `https://fonts.google.com/specimen/${encodeURIComponent(fontName.replace(/\s+/g, '+'))}`;
}

export function downloadImage(imageUrl: string, fileName: string) {
  fetch(imageUrl)
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}
