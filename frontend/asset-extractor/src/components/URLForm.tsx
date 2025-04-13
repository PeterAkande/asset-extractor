import { useState, FormEvent, useEffect } from 'react';
import { extractFromUrlWithProgress, ProgressEvent, ExtractorResponse } from '../api/extractorApi';
import ExtractionProgress from './ExtractionProgress';
import './URLForm.css';

interface URLFormProps {
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: ExtractorResponse | null) => void;
  isLoading?: boolean;
}

const URLForm = ({ setIsLoading, setError, setResults, isLoading = false }: URLFormProps) => {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ProgressEvent | null>(null);
  
  // Sample URLs for quick testing
  const sampleUrls = [
    { url: 'https://google.com', icon: '🔍', name: 'Google' },
    { url: 'https://github.com', icon: '🐙', name: 'GitHub' },
    { url: 'https://stripe.com', icon: '💳', name: 'Stripe' },
    { url: 'https://apple.com', icon: '🍎', name: 'Apple' }
  ];

  // Validate URL whenever it changes
  useEffect(() => {
    if (url.trim() === '') {
      setIsValidUrl(null);
      return;
    }
    
    try {
      new URL(url);
      setIsValidUrl(true);
    } catch (e) {
      console.log(e)
      setIsValidUrl(false);
    }
  }, [url]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      console.log(e)
      setError('Please enter a valid URL with http:// or https://');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setCurrentProgress(null);

    // Use SSE instead of direct API call
    const cleanup = extractFromUrlWithProgress(url, (progressEvent) => {
      console.log('Progress update:', progressEvent);
      setCurrentProgress(progressEvent);
      
      if (progressEvent.event === 'complete') {
        setResults(progressEvent.result || null);
        setIsLoading(false);
      } else if (progressEvent.event === 'error') {
        setError(progressEvent.message || 'Failed to extract assets');
        setIsLoading(false);
      }
    });
    
    // Store cleanup function for component unmount
    return () => cleanup();
  };

  const useExampleUrl = (exampleUrl: string) => {
    setUrl(exampleUrl);
    setIsValidUrl(true);
  };

  return (
    <div className="url-form-container">
      <div className="form-badge">
        <span className="form-badge-icon">🚀</span>
        <span className="form-badge-text">Quick Extract</span>
      </div>
      
      <form onSubmit={handleSubmit} className="url-form">
        <h3 className="form-title">Enter any website URL</h3>
        
        <div className="input-group">
          <div className={`url-input-wrapper ${isFocused ? 'focused' : ''}`}>
            <div className="url-input-icon">🌐</div>
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`url-input ${isValidUrl === false ? 'invalid' : ''}`}
              aria-label="Website URL"
              disabled={isLoading}
            />
            {isValidUrl === false && (
              <span className="error-message">Please enter a valid URL with http:// or https://</span>
            )}
          </div>
          <button 
            type="submit" 
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isValidUrl === false || isLoading}
          >
            {isLoading ? (
              <>
                <span className="button-spinner"></span>
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <span className="button-icon">🔍</span>
                <span>Extract Assets</span>
              </>
            )}
          </button>
        </div>
        
        {isLoading && currentProgress && (
          <ExtractionProgress currentProgress={currentProgress} />
        )}
        
        <div className="sample-urls-section">
          <div className="sample-urls-header">
            <div className="sample-divider"></div>
            <h4>Or try these examples</h4>
            <div className="sample-divider"></div>
          </div>
          
          <div className="sample-urls-grid">
            {sampleUrls.map((sample, index) => (
              <button 
                key={index}
                type="button" 
                className="sample-url-card"
                // eslint-disable-next-line react-hooks/rules-of-hooks
                onClick={() => useExampleUrl(sample.url)}
                disabled={isLoading}
              >
                <span className="sample-url-icon">{sample.icon}</span>
                <span className="sample-url-name">{sample.name}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
      
      <div className="form-decorations">
        <div className="decoration decoration-1"></div>
        <div className="decoration decoration-2"></div>
        <div className="decoration decoration-3"></div>
      </div>
    </div>
  );
};

export default URLForm;
