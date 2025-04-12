import { useState, useEffect } from 'react';
import { ExtractorResponse, ColorInfo, FontInfo, downloadImage } from '../api/extractorApi';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
  results: ExtractorResponse;
}

// Image Modal Component
const ImageModal = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <div className="image-modal-overlay" onClick={onClose}>
    <div className="image-modal-content" onClick={e => e.stopPropagation()}>
      <button className="close-modal-btn" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>
      <img src={src} alt="Preview" />
      <div className="modal-actions">
        <a 
          href={src} 
          download 
          className="download-modal-btn"
          onClick={() => downloadImage(src, src.split('/').pop() || 'image.jpg')}
        >
          <span className="material-icons">download</span>
          Download Image
        </a>
        <a href={src} target="_blank" rel="noopener noreferrer" className="view-original-btn">
          <span className="material-icons">open_in_new</span>
          View Original
        </a>
      </div>
    </div>
  </div>
);

// Video Modal Component
const VideoModal = ({ src, onClose }: { src: string; onClose: () => void }) => {
  const isEmbedded = src.includes('youtube.com') || src.includes('vimeo.com') || src.includes('dailymotion.com');
  const filename = src.split('/').pop() || 'video.mp4';

  const handleDownload = () => {
    if (!isEmbedded) {
      fetch(src)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          window.URL.revokeObjectURL(url);
        })
        .catch(err => console.error('Error downloading video:', err));
    }
  };

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
        
        <div className="video-modal-player">
          {isEmbedded ? (
            <iframe
              src={src}
              allowFullScreen
              title="Video preview"
              className="modal-video-iframe"
            ></iframe>
          ) : (
            <video 
              src={src} 
              controls 
              autoPlay
              className="modal-video-player"
            ></video>
          )}
        </div>

        <div className="modal-actions">
          {!isEmbedded && (
            <button 
              onClick={handleDownload}
              className="download-modal-btn"
            >
              <span className="material-icons">download</span>
              Download Video
            </button>
          )}
          <a href={src} target="_blank" rel="noopener noreferrer" className="view-original-btn">
            <span className="material-icons">open_in_new</span>
            View Original
          </a>
        </div>
      </div>
    </div>
  );
};

// Color Card Component
const ColorCard = ({ color }: { color: ColorInfo }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  const textColor = isLightColor(color.rgb) ? '#202124' : '#FFFFFF';
  
  return (
    <div className="color-card" onClick={copyToClipboard}>
      <div 
        className="color-preview" 
        style={{ backgroundColor: color.hex, color: textColor }}
      >
        {copied ? (
          <div className="copied-indicator">
            <span className="material-icons">check_circle</span>
            <span>Copied!</span>
          </div>
        ) : (
          color.hex
        )}
      </div>
      <div className="color-info">
        <h3 className="color-name">{color.name}</h3>
        <p className="color-rgb">RGB: {color.rgb.join(', ')}</p>
        {color.percentage && (
          <span className="color-usage">{color.percentage.toFixed(1)}%</span>
        )}
      </div>
    </div>
  );
};

// Font Card Component
const FontCard = ({ font }: { font: FontInfo }) => {
  const isGoogleFont = font.type.toLowerCase().includes('google');
  
  useEffect(() => {
    if (isGoogleFont) {
      const fontFamily = font.name.replace(/\s+/g, '+');
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [font.name, isGoogleFont]);
  
  const fontStyle = {
    fontFamily: `"${font.name}", system-ui, sans-serif`
  };
  
  return (
    <div className="font-card">
      <h3 className="font-name" style={fontStyle}>{font.name}</h3>
      
      <div className="font-preview" style={fontStyle}>
        <p className="font-sample-regular">
          <span className="font-sample-label">Regular:</span>
          <span className="font-sample-text">The quick brown fox jumps over the lazy dog</span>
        </p>
        <p className="font-sample-uppercase">
          <span className="font-sample-label">Uppercase:</span>
          <span className="font-sample-text">ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>
        </p>
        <p className="font-sample-numbers">
          <span className="font-sample-label">Numbers:</span>
          <span className="font-sample-text">0123456789</span>
        </p>
        {isGoogleFont && (
          <p className="font-sample-bold" style={{ fontWeight: 700 }}>
            <span className="font-sample-label">Bold:</span>
            <span className="font-sample-text">The quick brown fox jumps over the lazy dog</span>
          </p>
        )}
      </div>
      
      <div className="font-meta">
        <span className="font-type">{font.type}</span>
        {isGoogleFont && (
          <a 
            href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, '+')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-link"
          >
            <span className="material-icons">text_format</span>
            View on Google Fonts
          </a>
        )}
      </div>
    </div>
  );
};

// Video Card Component
const VideoCard = ({ src, onVideoClick }: { src: string; onVideoClick: (src: string) => void }) => {
  const isEmbedded = src.includes('youtube.com') || src.includes('vimeo.com') || src.includes('dailymotion.com');
  const filename = src.split('/').pop() || 'video.mp4';
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from opening modal
    
    if (!isEmbedded) {
      fetch(src)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          window.URL.revokeObjectURL(url);
        })
        .catch(err => console.error('Error downloading video:', err));
    }
  };
  
  return (
    <div 
      className="image-card video-card-clickable" 
      onClick={() => onVideoClick(src)}
    >
      <div className="image-preview video-preview-container">
        {isEmbedded ? (
          <iframe
            src={`${src}${src.includes('?') ? '&' : '?'}autoplay=1&mute=1&loop=1&controls=0`}
            title="Video preview"
            allow="autoplay; encrypted-media;"
            className="card-video-iframe"
            scrolling="no"
          ></iframe>
        ) : (
          <video 
            src={src} 
            autoPlay 
            muted 
            loop
            playsInline
            className="card-video-player"
          ></video>
        )}

        <div className="video-type-badge">
          {isEmbedded ? (
            src.includes('youtube.com') ? 'YouTube' :
            src.includes('vimeo.com') ? 'Vimeo' : 
            'Embedded Video'
          ) : (
            filename.split('.').pop()?.toUpperCase() || 'Video'
          )}
        </div>
        
        <div className="image-overlay">
          <button className="preview-btn">
            <span className="material-icons">play_circle_outline</span>
          </button>
        </div>
      </div>
      
      <button 
        className="download-image-btn"
        onClick={!isEmbedded ? handleDownload : (e) => {
          e.stopPropagation();
          onVideoClick(src);
        }}
      >
        <span className="material-icons">{!isEmbedded ? 'download' : 'play_arrow'}</span>
        {!isEmbedded ? 'Download' : 'Play Video'}
      </button>
    </div>
  );
};

// Helper function to determine if a color is light or dark
function isLightColor(rgb: number[]): boolean {
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5;
}

const ResultsDisplay = ({ results }: ResultsDisplayProps) => {
  const [activeTab, setActiveTab] = useState('colors');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  if (!results) {
    return <div className="no-data">No results to display</div>;
  }
  
  const { colors, fonts, assets } = results;
  const allColors = [...(colors.from_css || []), ...(colors.from_images || [])];
  
  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const validImages = (assets.images || []).filter(img => 
    !img.startsWith('data:') || 
    validImageExtensions.some(ext => img.toLowerCase().includes(ext)) ||
    /\.(jpe?g|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(img)
  );
  
  const validVideoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv'];
  const validVideos = (assets.videos || []).filter(vid => 
    validVideoExtensions.some(ext => vid.toLowerCase().includes(ext)) ||
    /\.(mp4|webm|ogg|mov|avi|wmv|flv)(\?.*)?$/i.test(vid) ||
    vid.includes('youtube.com') ||
    vid.includes('vimeo.com') ||
    vid.includes('dailymotion.com') ||
    vid.includes('facebook.com/plugins/video')
  );
  
  const filteredImages = search ? 
    validImages.filter(img => img.toLowerCase().includes(search.toLowerCase())) : 
    validImages;
  
  const filteredVideos = search ?
    validVideos.filter(vid => vid.toLowerCase().includes(search.toLowerCase())) :
    validVideos;
  
  const filteredFonts = search && fonts ?
    fonts.filter(font => font.name.toLowerCase().includes(search.toLowerCase())) :
    fonts;
  
  return (
    <div className="results-display">
      <div className="results-header">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'colors' ? 'active' : ''}`} 
            onClick={() => setActiveTab('colors')}
          >
            <span className="material-icons">palette</span>
            <span>Colors</span>
            <span className="tab-count">{allColors.length}</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'images' ? 'active' : ''}`} 
            onClick={() => setActiveTab('images')}
          >
            <span className="material-icons">image</span>
            <span>Images</span>
            <span className="tab-count">{validImages.length}</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`} 
            onClick={() => setActiveTab('videos')}
          >
            <span className="material-icons">videocam</span>
            <span>Videos</span>
            <span className="tab-count">{validVideos.length}</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'fonts' ? 'active' : ''}`} 
            onClick={() => setActiveTab('fonts')}
          >
            <span className="material-icons">text_fields</span>
            <span>Fonts</span>
            <span className="tab-count">{fonts?.length || 0}</span>
          </button>
        </div>
      </div>
      
      <div className="results-content">
        {activeTab === 'colors' && (
          <div className="colors-tab tab-content">
            {allColors.length > 0 ? (
              <div className="color-grid">
                {allColors.map((color, index) => (
                  <ColorCard key={`${color.hex}-${index}`} color={color} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-icons">palette_off</span>
                <h3>No colors found</h3>
                <p>We couldn't find any colors on this website.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'images' && (
          <div className="images-tab tab-content">
            {filteredImages.length > 0 ? (
              <div className="image-grid">
                {filteredImages.map((image, index) => (
                  <div key={index} className="image-card">
                    <div 
                      className="image-preview" 
                      onClick={() => setSelectedImage(image)}
                      style={{ 
                        backgroundImage: `url(${image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="image-overlay">
                        <button className="preview-btn">
                          <span className="material-icons">zoom_in</span>
                        </button>
                      </div>
                    </div>
                    <button 
                      className="download-image-btn"
                      onClick={() => downloadImage(image, image.split('/').pop() || 'image.jpg')}
                    >
                      <span className="material-icons">download</span>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-icons">hide_image</span>
                <h3>No images found</h3>
                <p>{search ? `No images matching "${search}"` : "We couldn't find any images on this website."}</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'videos' && (
          <div className="videos-tab tab-content">
            {filteredVideos.length > 0 ? (
              <div className="video-grid">
                {filteredVideos.map((video, index) => (
                  <VideoCard 
                    key={index} 
                    src={video} 
                    onVideoClick={(src) => setSelectedVideo(src)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-icons">videocam_off</span>
                <h3>No videos found</h3>
                <p>{search ? `No videos matching "${search}"` : "We couldn't find any videos on this website."}</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'fonts' && (
          <div className="fonts-tab tab-content">
            {filteredFonts && filteredFonts.length > 0 ? (
              <div className="font-grid">
                {filteredFonts.map((font, index) => (
                  <FontCard key={index} font={font} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-icons">format_clear</span>
                <h3>No fonts found</h3>
                <p>{search ? `No fonts matching "${search}"` : "We couldn't find any fonts on this website."}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {selectedImage && (
        <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
      
      {selectedVideo && (
        <VideoModal src={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
};

export default ResultsDisplay;
