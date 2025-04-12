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

export interface ProgressEvent {
  event: 'start' | 'progress' | 'complete' | 'error' | 'cancelled' | 'end';
  stage?: string;
  data?: any;
  message?: string;
  result?: ExtractorResponse;
  url?: string;
}

export type ProgressCallback = (progressEvent: ProgressEvent) => void;

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

export function extractFromUrlWithProgress(url: string, onProgress: ProgressCallback): () => void {
  const eventSource = new EventSource(`${API_URL}/api/extract-sse?url=${encodeURIComponent(url)}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
      
      // Close the EventSource when we're done
      if (data.event === 'complete' || data.event === 'error' || data.event === 'cancelled' || data.event === 'end') {
        eventSource.close();
      }
    } catch (error) {
      console.error('Error parsing SSE event:', error);
    }
  };
  
  eventSource.onerror = () => {
    onProgress({
      event: 'error',
      message: 'Connection to the server was lost. Please try again.'
    });
    eventSource.close();
  };
  
  // Return a cleanup function
  return () => {
    eventSource.close();
  };
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
