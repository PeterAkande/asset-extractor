import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ResultsDisplay from '../components/ResultsDisplay';
import Footer from '../components/Footer';
import { ExtractorResponse, fetchCachedResult } from '../api/extractorApi';

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
        setError('Failed to load results. The extraction may have expired or been removed.');
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

  return (
    <div className="results-page">
      <Navbar onLogoClick={handleLogoClick} />
      
      <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px', borderRadius: '8px' }}>
        <div className="results-header">
            <br></br>
          <h1 className="page-title">Extraction Results</h1>
          {results && (
            <p className="results-subtitle ">
              Assets extracted from <strong>{results.url}</strong>
              {/* {results.cached && <span className="cached-badge">Cached Result</span>} */}
            </p>
          )}
        </div>
        
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
            <ResultsDisplay results={results} />
            
            <div className="back-button-container" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button className="secondary-button" onClick={handleExtractAnother}>
                Extract Another Website
              </button>
            </div>
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
      
      <Footer />
    </div>
  );
};

export default ResultsPage;
