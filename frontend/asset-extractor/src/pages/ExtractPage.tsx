import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import URLForm from '../components/URLForm';
import Footer from '../components/Footer';
import ExtractionProgress from '../components/ExtractionProgress';
import { ProgressEvent, extractFromUrlWithProgress } from '../api/extractorApi';
import './ExtractPage.css';

const ExtractPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<ProgressEvent | null>(null);
  
  const handleLogoClick = () => {
    navigate('/');
  };

  const handleExtraction = (url: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentProgress(null);
    
    // Use SSE to track progress
    const cleanup = extractFromUrlWithProgress(url, (progressEvent) => {
      setCurrentProgress(progressEvent);
      
      if (progressEvent.event === 'complete' && progressEvent.result) {
        setIsLoading(false);

        console.log('Extraction complete:', progressEvent.result);
        
        // When complete, navigate to results page with result_id in URL
        // and pass the full result data in state for immediate display
        navigate(`/result/${progressEvent.result.result_id}`, { 
          state: { results: progressEvent.result }
        });
      } 
      else if (progressEvent.event === 'error') {
        setError(progressEvent.message || 'Failed to extract assets');
        setIsLoading(false);
      }
    });
    
    return cleanup;
  };

  return (
    <div className="extract-page">
      <Navbar onLogoClick={handleLogoClick} />
      
      {/* Enhanced decorative elements */}
      <div className="extract-decoration decoration-1"></div>
      <div className="extract-decoration decoration-2"></div>
      <div className="extract-decoration decoration-3"></div>
      <div className="extract-decoration decoration-4"></div>
      
      <div className="container">
        <div className="extract-badge">
          <span className="badge-icon">✨</span>
          <span>Website Asset Extractor</span>
        </div>
        
        <h1 className="page-title">
          Extract Assets from Any Website
        </h1>
        
        <p className="page-subtitle">
          Discover and export colors, fonts, images, and icons from any website in seconds.
          Perfect for designers and developers seeking inspiration or brand assets.
        </p>
        
        <section id="extraction-form" className="extract-form-section">
          <URLForm 
            setIsLoading={setIsLoading} 
            setError={setError} 
            onExtract={handleExtraction}
            isLoading={isLoading}
          />

          {error && (
            <div className="error-container">
              <p className="error-message">{error}</p>
            </div>
          )}
          
          {isLoading && currentProgress && (
            <ExtractionProgress currentProgress={currentProgress} />
          )}
        </section>
      </div>
      
      <Footer />
    </div>
  );
};

export default ExtractPage;
