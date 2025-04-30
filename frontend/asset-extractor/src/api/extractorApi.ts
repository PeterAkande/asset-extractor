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
  icons: string[]; // SVG icons
  svgs: string[]; // Regular SVGs
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
  result_id?: string;
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

export async function extractFromUrl(url: string): Promise<ExtractorResponse> {
  try {
    console.log('Sending request to extract assets from:', url);
    
    const response = await fetch(`/api/extract`, {
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

/**
 * Fetch cached results from the API using a result ID
 */
export async function fetchCachedResult(resultId: string): Promise<ExtractorResponse> {
  try {
    const response = await fetch(`/api/cache/${resultId}`);
    
    if (!response.ok) {
      throw new Error(response.statusText || 'Failed to fetch cached results');
    }
    
    const data = await response.json();
    return data as ExtractorResponse;
  } catch (error) {
    console.error('Error fetching cached results:', error);
    throw error;
  }
}

export function extractFromUrlWithProgress(url: string, onProgress: ProgressCallback): () => void {
  const eventSource = new EventSource(`/api/extract-sse?url=${encodeURIComponent(url)}`);
  
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

// Add a utility function to handle SVG data
export const processSvgDataUri = (dataUri: string): string => {
  // Ensure SVG data is properly formatted
  if (dataUri.startsWith('data:image/svg+xml;base64,')) {
    // Already properly formatted
    return dataUri;
  }
  
  // Try to extract the SVG content and reformat it
  try {
    // If it's raw SVG content
    if (dataUri.trim().startsWith('<svg')) {
      const base64Content = btoa(dataUri);
      return `data:image/svg+xml;base64,${base64Content}`;
    }
    
    // If it's a URL-encoded SVG
    if (dataUri.startsWith('data:image/svg+xml,')) {
      const svgContent = decodeURIComponent(dataUri.substring(18));
      const base64Content = btoa(svgContent);
      return `data:image/svg+xml;base64,${base64Content}`;
    }
  } catch (error) {
    console.error('Failed to process SVG data:', error);
  }
  
  // Return original if we can't process it
  return dataUri;
};

/**
 * Normalizes and optimizes SVG content for better display
 */
export const optimizeSvgContent = (svgContent: string): string => {
  try {
    // Add namespace if missing
    if (!svgContent.includes('xmlns=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Add viewBox if missing but has width/height
    if (!svgContent.includes('viewBox=')) {
      const widthMatch = svgContent.match(/width=["'](\d+(?:\.\d+)?)["']/);
      const heightMatch = svgContent.match(/height=["'](\d+(?:\.\d+)?)["']/);
      
      if (widthMatch && heightMatch) {
        const width = widthMatch[1];
        const height = heightMatch[1];
        svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`);
      }
    }
    
    // Set color for paths that don't have fill or stroke
    svgContent = svgContent.replace(/<path(?![^>]*?(?:fill|stroke))[^>]*>/gi, 
                                   '<path fill="currentColor" $&');
    
    return svgContent;
  } catch (error) {
    console.error('Error optimizing SVG:', error);
    return svgContent; // Return original if optimization fails
  }
};

/**
 * Helper to safely download SVG content
 */
export const downloadSvg = (svgDataUri: string, filename: string = 'icon.svg'): void => {
  try {
    let svgContent: string;
    
    // Decode the data URI
    if (svgDataUri.startsWith('data:image/svg+xml;base64,')) {
      svgContent = atob(svgDataUri.split('base64,')[1]);
    } else if (svgDataUri.startsWith('data:image/svg+xml,')) {
      svgContent = decodeURIComponent(svgDataUri.split('data:image/svg+xml,')[1]);
    } else if (svgDataUri.startsWith('<svg')) {
      svgContent = svgDataUri;
    } else {
      console.error('Invalid SVG data URI format');
      return;
    }
    
    // Optimize the SVG content
    const optimizedSvg = optimizeSvgContent(svgContent);
    
    // Create a Blob with the SVG content
    const blob = new Blob([optimizedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading SVG:', error);
  }
};

// /**
//  * Downloads an SVG as a file
//  */
// export const downloadSvg = (svgContent: string, filename: string = 'icon.svg'): void => {
//   try {
//     // Create a blob from the SVG content
//     const blob = new Blob([svgContent], { type: 'image/svg+xml' });
//     const url = URL.createObjectURL(blob);
    
//     // Create a link element and trigger download
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();
    
//     // Clean up
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   } catch (error) {
//     console.error('Error downloading SVG:', error);
//   }
// };
