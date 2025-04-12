import { useState } from 'react';
import { downloadImage } from '../api/extractorApi';
import './ImageGallery.css';

interface ImageGalleryProps {
  images: string[];
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [visibleImages, setVisibleImages] = useState(12);
  
  const handleDownload = (imageUrl: string) => {
    // Extract filename from URL or use a default
    const filename = imageUrl.split('/').pop() || 'image.png';
    downloadImage(imageUrl, filename);
  };

  // Filter out data URLs which can be massive
  const filteredImages = images.filter(img => !img.startsWith('data:'));
  
  if (filteredImages.length === 0) {
    return <p className="no-results">No images found on this page.</p>;
  }

  return (
    <div className="image-gallery">
      <div className="image-count">
        <p>Showing {Math.min(visibleImages, filteredImages.length)} of {filteredImages.length} images</p>
      </div>

      <div className="image-grid">
        {filteredImages.slice(0, visibleImages).map((image, index) => (
          <div className="image-card" key={`${image.substring(0, 20)}-${index}`}>
            <div className="image-wrapper">
              <img 
                src={image} 
                alt={`Asset ${index + 1}`} 
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://placehold.co/400x300?text=Image+Failed+to+Load';
                }}
              />
              <div className="image-overlay">
                <button 
                  className="download-btn"
                  onClick={() => handleDownload(image)}
                >
                  Download
                </button>
                <a 
                  href={image} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-btn"
                >
                  View Original
                </a>
              </div>
            </div>
            <div className="image-info">
              <p className="image-url" title={image}>
                {image.length > 40 ? `${image.substring(0, 40)}...` : image}
              </p>
            </div>
          </div>
        ))}
      </div>

      {visibleImages < filteredImages.length && (
        <div className="load-more-container">
          <button 
            className="load-more-btn"
            onClick={() => setVisibleImages(prev => prev + 12)}
          >
            Load More Images
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
