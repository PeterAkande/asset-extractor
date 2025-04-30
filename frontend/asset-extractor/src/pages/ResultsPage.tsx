import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import ResultsDisplay from '../components/ResultsDisplay';
import Footer from '../components/Footer';
import { ExtractorResponse, fetchCachedResult } from '../api/extractorApi';
import './ResultsPage.css';

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resultId } = useParams<{ resultId: string }>();
  
  // Try to get results from navigation state first
  const passedResults = location.state?.results as ExtractorResponse | undefined;
  
  const [results, setResults] = useState<ExtractorResponse | null>(passedResults || null);
  const [loading, setLoading] = useState<boolean>(!passedResults);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Skip API call if we already have results from navigation state
    if (passedResults || !resultId) return;
    
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCachedResult(resultId);
        setResults(data);
        setLoading(false);
      } catch (err) {
        const errorMessage = 'Failed to load results. The extraction may have expired or been removed.';
        setError(errorMessage);
        console.error('Error fetching results:', err);
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [resultId, passedResults]);
  
  // Redirect if no resultId is provided
  useEffect(() => {
    if (!resultId) {
      navigate('/extract');
    }
  }, [resultId, navigate]);

  const handleLogoClick = () => {
    navigate('/');
  };
  
  const handleExtractAnother = () => {
    navigate('/extract');
  };

  // Helper function to ensure URLs are absolute
  const getAbsoluteUrl = (url: string): string => {
    try {
      return new URL(url).href; // This will throw an error if url is relative
    } catch (e) {
      // If it's a relative URL, make it absolute relative to the extracted site
      if (results?.url) {
        try {
          return new URL(url, results.url).href;
        } catch (e) {
          return url; // Return original if we can't parse it
        }
      }
      return url;
    }
  };

  // Get the best image for Open Graph
  const getOpenGraphImage = () => {
    if (!results) return '';
    
    // Check if we have any images in the results
    if (results.assets.images && results.assets.images.length > 0) {
      return getAbsoluteUrl(results.assets.images[0]); // Return the first image
    }
    
    // If no regular images, try icons
    if (results.assets.icons && results.assets.icons.length > 0) {
      return getAbsoluteUrl(results.assets.icons[0]);
    }
    
    return ''; // No images available
  };

  return (
    <div className="results-page">
      {/* Dynamic meta tags */}
      {results && (
        <Helmet>
          <title>Assets Extracted from {results.url}</title>
          <meta name="description" content={`Web assets extracted from ${results.url} - colors, fonts, images and more`} />
          
          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:title" content={`Assets Extracted from ${results.url}`} />
          <meta property="og:description" content={`Web assets extracted from ${results.url} - colors, fonts, images and more`} />
          {getOpenGraphImage() && <meta property="og:image" content={getOpenGraphImage()} />}
          
          {/* Twitter */}
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content={window.location.href} />
          <meta property="twitter:title" content={`Assets Extracted from ${results.url}`} />
          <meta property="twitter:description" content={`Web assets extracted from ${results.url} - colors, fonts, images and more`} />
          {getOpenGraphImage() && <meta property="twitter:image" content={getOpenGraphImage()} />}
        </Helmet>
      )}

      <Navbar onLogoClick={handleLogoClick} />
      
      <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px', borderRadius: '8px' }}>
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading results...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <h3>Error Loading Results</h3>
            <p>{error}</p>
            <button className="primary-button" onClick={handleExtractAnother}>
              Extract Another Website
            </button>
          </div>
        ) : results ? (
          <div className="results-container">
            <div className="results-title-section">
              <h1 className="page-title">Extraction Results</h1>
              <p className="results-subtitle">
                Assets extracted from <strong>{results.url}</strong>
              </p>
            </div>
            
            <ResultsDisplay results={results} />
          </div>
        ) : (
          <div className="error-container">
            <h3>No Results Found</h3>
            <p>We couldn't find any extraction results for the provided ID.</p>
            <button className="primary-button" onClick={handleExtractAnother}>
              Extract Another Website
            </button>
          </div>
        )}
      </div>
      
      {/* Floating Extract Another Button */}
      {results && !loading && (
        <button className="floating-extract-button" onClick={handleExtractAnother}>
          <span className="material-icons">add</span>
          Extract Another Website
        </button>
      )}
      
      <Footer />
    </div>
  );
};

export default ResultsPage;
