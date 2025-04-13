import React, { useState, useEffect, useRef } from 'react';

interface SvgRendererProps {
  content: string;  // Raw SVG content or data URI
  className?: string;
  onClick?: () => void;
  width?: string | number;
  height?: string | number;
}

/**
 * A component for rendering SVG content with multiple fallback strategies
 * Handles both raw SVG markup and data URIs
 */
const SvgRenderer: React.FC<SvgRendererProps> = ({ 
  content, 
  className = '', 
  onClick, 
  width, 
  height 
}) => {
  const [renderMethod, setRenderMethod] = useState<'inline' | 'img' | 'object' | 'error'>('inline');
  const [key, setKey] = useState<number>(0); // Used to force re-render
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInverted, setIsInverted] = useState(false);

  // Reset renderer when content changes
  useEffect(() => {
    setRenderMethod('inline');
  }, [content]);

  // Monitor if SVG was rendered correctly
  useEffect(() => {
    if (renderMethod === 'inline') {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const svgElement = containerRef.current.querySelector('svg');
          
          // Check if SVG element exists and has dimensions
          if (!svgElement || 
              (svgElement.getBoundingClientRect().width === 0 && 
               svgElement.getBoundingClientRect().height === 0)) {
            console.log('SVG not rendering properly with inline method, trying img method');
            setRenderMethod('img');
          }
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [renderMethod, key, content]);

  // Determine if the content is a data URI or raw SVG
  const isDataUri = content && typeof content === 'string' && content.startsWith('data:');
  const isRawSvg = content && typeof content === 'string' && content.trim().startsWith('<svg');
  
  // Get the SVG source based on content type
  const getSvgSource = () => {
    if (!content) {
      return getEmptySvg();
    }
    
    if (isRawSvg) {
      // Add styles to ensure SVG is visible
      return enhanceSvgVisibility(content);
    } else if (isDataUri) {
      try {
        if (content.startsWith('data:image/svg+xml;base64,')) {
          const decodedContent = atob(content.split('base64,')[1] || "");
          return enhanceSvgVisibility(decodedContent);
        } else if (content.startsWith('data:image/svg+xml,')) {
          const decodedContent = decodeURIComponent(content.split('data:image/svg+xml,')[1]);
          return enhanceSvgVisibility(decodedContent);
        }
      } catch (error) {
        console.error("Error extracting SVG from data URI:", error);
      }
    }
    
    // Fallback to empty SVG
    return getEmptySvg();
  };

  // Enhance SVG to ensure it's visible (add fill colors if missing)
  const enhanceSvgVisibility = (svgContent: string): string => {
    // Make sure SVG has a viewBox and dimensions
    if (!svgContent.includes('viewBox=')) {
      const widthMatch = svgContent.match(/width=["'](\d+(?:\.\d+)?)/i);
      const heightMatch = svgContent.match(/height=["'](\d+(?:\.\d+)?)/i);
      
      if (widthMatch && heightMatch) {
        const width = widthMatch[1];
        const height = heightMatch[1];
        svgContent = svgContent.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`);
      } else {
        svgContent = svgContent.replace('<svg', '<svg viewBox="0 0 24 24" width="24" height="24"');
      }
    }

    // Add a style tag to ensure visibility
    if (!svgContent.includes('</style>')) {
      svgContent = svgContent.replace('<svg', '<svg style="color: #333;"');
    }

    // Ensure paths have fill or stroke if missing
    svgContent = svgContent.replace(/<path(?![^>]*?(?:fill|stroke))[^>]*>/gi, 
                                    '<path fill="currentColor" $&');
    
    // Ensure rect elements have fill if missing
    svgContent = svgContent.replace(/<rect(?![^>]*?(?:fill))[^>]*>/gi, 
                                   '<rect fill="currentColor" $&');
    
    // Ensure circle, ellipse elements have fill if missing
    svgContent = svgContent.replace(/<(circle|ellipse)(?![^>]*?(?:fill))[^>]*>/gi, 
                                   '<$1 fill="currentColor" $&');
    
    // Ensure polygon, polyline elements have fill if missing
    svgContent = svgContent.replace(/<(polygon|polyline)(?![^>]*?(?:fill|stroke))[^>]*>/gi, 
                                    '<$1 fill="currentColor" $&');

    return svgContent;
  };
  
  // Generate an empty SVG as fallback
  const getEmptySvg = () => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect width="24" height="24" fill="#f0f0f0" />
      <text x="12" y="12" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="#666">SVG</text>
    </svg>`;
  };

  // Show error state when all rendering methods fail
  if (renderMethod === 'error') {
    return (
      <div 
        className={`svg-error ${className}`}
        onClick={onClick}
        style={{ width, height }}
      >
        <span className="material-icons">error_outline</span>
        <p>Failed to render SVG</p>
      </div>
    );
  }

  // Try a different method if current method fails
  const handleRenderError = () => {
    if (renderMethod === 'inline') {
      setRenderMethod('img');
    } else if (renderMethod === 'img') {
      setRenderMethod('object');
    } else {
      setRenderMethod('error');
    }
  };

  // Force re-render with inline method
  const handleRetry = () => {
    setKey(prev => prev + 1);
    setRenderMethod('inline');
  };

  // Create a data URI for img/object methods
  const getDataUri = () => {
    if (isDataUri) {
      return content;
    }
    
    // Create data URI from raw SVG
    if (isRawSvg) {
      try {
        const enhancedSvg = enhanceSvgVisibility(content);
        const encoded = btoa(unescape(encodeURIComponent(enhancedSvg)));
        return `data:image/svg+xml;base64,${encoded}`;
      } catch (error) {
        console.error("Error creating data URI from SVG:", error);
        return "";
      }
    }
    
    return "";
  };

  // Container styling with checkered background
  const containerStyle = {
    width, 
    height,
    backgroundColor: '#f5f5f7',
  };

  // Render SVG based on selected method
  switch (renderMethod) {
    case 'inline':
      return (
        <div 
          ref={containerRef}
          className={`svg-container ${className}`}
          data-svg-key={key}
          onClick={onClick}
          dangerouslySetInnerHTML={{ __html: getSvgSource() }}
          style={containerStyle}
        />
      );
      
    case 'img':
      return (
        <div 
          className={`svg-container ${className}`}
          onClick={onClick}
          style={containerStyle}
        >
          <img 
            src={getDataUri()}
            alt="SVG content" 
            onError={handleRenderError}
            className="svg-img"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      );
      
    case 'object':
      return (
        <div 
          className={`svg-container ${className}`}
          onClick={onClick}
          style={containerStyle}
        >
          <object 
            data={getDataUri()} 
            type="image/svg+xml"
            className="svg-object"
            onError={handleRenderError}
            style={{ width: '100%', height: '100%' }}
          >
            <button onClick={handleRetry} className="svg-retry-btn">
              <span className="material-icons">refresh</span> Retry
            </button>
          </object>
        </div>
      );
      
    default:
      return null;
  }
};

export default SvgRenderer;
