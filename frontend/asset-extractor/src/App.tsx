import { useState, useEffect } from 'react'
import './App.css'
import { ExtractorResponse } from './api/extractorApi'
import URLForm from './components/URLForm'
import ResultsDisplay from './components/ResultsDisplay'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FeatureSection from './components/FeatureSection'
import HeroSection from './components/HeroSection'
import TestimonialSection from './components/TestimonialSection'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ExtractorResponse | null>(null)

  // Debug to track state changes
  useEffect(() => {
    console.log("App state updated:", { isLoading, error, hasResults: !!results });
  }, [isLoading, error, results]);

  const startExtraction = () => {
    // Smoothly scroll to the form section when CTA is clicked
    document.getElementById('extraction-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetApp = () => {
    setResults(null);
    setError(null);
    window.scrollTo(0, 0);
  };

  // If we have results, show the results page instead of the landing page
  if (results) {
    return (
      <div className="app-container results-page">
        <header className="results-header">
          <div className="container results-header-content">
            <div className="results-logo" onClick={resetApp}>
              <div className="logo-mark">
                <span style={{ color: '#4285F4' }}>A</span>
                <span style={{ color: '#EA4335' }}>s</span>
                <span style={{ color: '#FBBC05' }}>s</span>
                <span style={{ color: '#34A853' }}>e</span>
                <span style={{ color: '#4285F4' }}>t</span>
                <span style={{ color: '#EA4335' }}>X</span>
              </div>
            </div>

            <div className="results-info">
              <h1 className="results-title">
                <span className="results-badge">Extracted Assets</span>
                <span className="results-from">from</span> 
                <a href={results.url} target="_blank" rel="noopener noreferrer" className="results-url">
                  {new URL(results.url).hostname}
                  <span className="results-url-icon material-icons">open_in_new</span>
                </a>
              </h1>
            </div>
            
            <button className="back-button" onClick={resetApp}>
              <span className="material-icons">arrow_back</span>
              Back to Home
            </button>
          </div>
        </header>

        <main>
          <div className="container">
            <div className="results-wrapper">
              <ResultsDisplay results={results} />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Otherwise, show the landing page
  return (
    <div className="app-container">
      <Navbar onLogoClick={resetApp} />

      <main className="app-content">
        <HeroSection onGetStarted={startExtraction} />
        <FeatureSection />
        <TestimonialSection />
        
        <section id="extraction-form" className="extraction-section">
          <div className="container">
            <div className="section-title">
              <h2>Try It Now</h2>
              <p>Enter any website URL to extract its colors, fonts, and assets</p>
            </div>
            
            <URLForm 
              setIsLoading={setIsLoading} 
              setError={setError} 
              setResults={setResults}
              isLoading={isLoading} // Pass isLoading to URLForm
            />
            
            {/* Remove the separate loading container since the button now shows loading state */}
            
            {!isLoading && error && (
              <div className="error-container">
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
