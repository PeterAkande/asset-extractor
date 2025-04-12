import { useState } from 'react';
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
  
  return (
    <div className="font-card">
      <h3 className="font-name" style={{ fontFamily: font.name }}>{font.name}</h3>
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
const VideoCard = ({ src }: { src: string }) => {
  const [showControls, setShowControls] = useState(false);
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
    <div className="video-card">
      <div 
        className="video-container"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {isEmbedded ? (
          <iframe
            src={src}
            allowFullScreen
            title="Embedded video"
          ></iframe>
        ) : (
          <video 
            src={src} 
            controls={showControls}
            poster={`${src}#t=0.1`}
            preload="metadata"
          ></video>
        )}
      </div>
      <div className="video-actions">
        <a href={src} target="_blank" rel="noopener noreferrer" className="view-video-btn">
          <span className="material-icons">open_in_new</span>
          View Original
        </a>
        {!isEmbedded && (
          <button onClick={handleDownload} className="download-video-btn">
            <span className="material-icons">download</span>
            Download
          </button>
        )}
      </div>
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

        <div className="search-container">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')}>
              <span className="material-icons">clear</span>
            </button>
          )}
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
                  <VideoCard key={index} src={video} />
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
    </div>
  );
};

export default ResultsDisplay;
