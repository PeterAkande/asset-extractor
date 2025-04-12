import './HeroSection.css';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="hero-section">
      <div className="container hero-container">
        <div className="hero-content">
          <span className="hero-badge">Web Analysis Tool</span>
          <h1 className="hero-title">
            Extract Design Assets from Any Website
          </h1>
          <p className="hero-description">
            Discover colors, fonts, and assets from any website. Perfect for designers, developers, 
            and creative professionals looking to streamline their workflow.
          </p>
          <div className="hero-buttons">
            <button onClick={onGetStarted} className="primary-button">
              Try It Now
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} 
              className="text-button">
              Learn more
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">5,000+</span>
              <span className="stat-label">Websites Analyzed</span>
            </div>
            <div className="stat">
              <span className="stat-value">2,300+</span>
              <span className="stat-label">Happy Users</span>
            </div>
            <div className="stat">
              <span className="stat-value">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="browser-mockup">
            <div className="browser-header">
              <div className="browser-controls">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="browser-address">assetx.io/extract</div>
            </div>
            <div className="browser-content">
              <div className="color-grid">
                <div className="color-swatch" style={{ backgroundColor: '#4285F4' }}></div>
                <div className="color-swatch" style={{ backgroundColor: '#34A853' }}></div>
                <div className="color-swatch" style={{ backgroundColor: '#FBBC05' }}></div>
                <div className="color-swatch" style={{ backgroundColor: '#EA4335' }}></div>
              </div>
              <div className="asset-preview">
                <div className="asset-item"></div>
                <div className="asset-item"></div>
              </div>
              <div className="font-list">
                <div className="font-item">
                  <div className="font-name"></div>
                  <div className="font-type"></div>
                </div>
                <div className="font-item">
                  <div className="font-name"></div>
                  <div className="font-type"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-divider">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 30" preserveAspectRatio="none">
          <path d="M0,30 C600,10 1000,20 1200,30 L1200,0 L0,0 Z" fill="#F1F3F4"></path>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
