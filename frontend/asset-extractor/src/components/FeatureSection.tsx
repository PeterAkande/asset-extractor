import { useEffect, useRef } from 'react';
import './FeatureSection.css';

const FeatureSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
        }
      });
    }, { threshold: 0.1 });

    const featuresSection = sectionRef.current;
    if (featuresSection) {
      observer.observe(featuresSection);
    }

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      (card as HTMLElement).style.animationDelay = `${index * 0.1}s`;
      observer.observe(card);
    });
    
    const revealElements = document.querySelectorAll('.reveal-element');
    revealElements.forEach(element => {
      observer.observe(element);
    });

    return () => {
      if (featuresSection) observer.unobserve(featuresSection);
      featureCards.forEach(card => observer.unobserve(card));
      revealElements.forEach(element => observer.unobserve(element));
    };
  }, []);

  // Ensure all elements are animated on load
  useEffect(() => {
    // Make the section title visible immediately on mobile
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle && window.innerWidth < 768) {
      sectionTitle.classList.add('animated');
    }
  }, []);

  const features = [
    {
      id: 1,
      title: "Color Extraction",
      description: "Extract colors from CSS and images to identify the exact color palette used on any website.",
      icon: "palette",
      color: "#4285F4"
    },
    {
      id: 2,
      title: "Font Detection",
      description: "Discover what fonts are being used, including Google Fonts, custom web fonts, and system fonts.",
      icon: "text_fields",
      color: "#EA4335"
    },
    {
      id: 3,
      title: "Asset Collection",
      description: "Find and download images, videos, scripts and stylesheets used across the website.",
      icon: "collections",
      color: "#FBBC05"
    },
    {
      id: 4,
      title: "Instant Analysis",
      description: "Get immediate results with our powerful extraction engine - no need to wait.",
      icon: "bolt",
      color: "#34A853"
    }
  ];

  return (
    <section id="features" className="features-section" ref={sectionRef}>
      <div className="features-backdrop"></div>
      
      <div className="container">
        <div className="section-title reveal-element animated">
          {/* <span className="subtitle">Why Choose AssetX</span> */}
          <h2 className="features-main-title">Powerful Features</h2>
          <p>Everything you need to analyze and extract design elements from any website.</p>
        </div>

        <div className="features-grid">
          {features.map(feature => (
            <div key={feature.id} className="feature-card reveal-element">
              <div className="feature-icon-wrapper" style={{background: `linear-gradient(135deg, ${feature.color}, ${feature.color}88)`}}>
                <div className="feature-icon" style={{backgroundColor: feature.color}}>
                  <span className="material-icons">{feature.icon}</span>
                </div>
              </div>
              <div className="feature-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="features-highlight reveal-element">
          <div className="highlight-content">
            <div className="accent-line"></div>
            <h2>Built for designers and developers</h2>
            <p className="highlight-description">AssetX helps creative professionals save time by quickly extracting design elements from websites without needing to inspect code or use complex tools.</p>
            <ul className="highlight-list">
              <li>
                <div className="check-icon-wrapper">
                  <span className="material-icons check-icon">check_circle</span>
                </div>
                <span>Extract colors and create palettes instantly</span>
              </li>
              <li>
                <div className="check-icon-wrapper">
                  <span className="material-icons check-icon">check_circle</span>
                </div>
                <span>Identify fonts used on any website</span>
              </li>
              <li>
                <div className="check-icon-wrapper">
                  <span className="material-icons check-icon">check_circle</span>
                </div>
                <span>Download assets directly to your computer</span>
              </li>
              <li>
                <div className="check-icon-wrapper">
                  <span className="material-icons check-icon">check_circle</span>
                </div>
                <span>Simple, fast and accurate results</span>
              </li>
            </ul>
            <button className="primary-button">
              Start Extracting Now
              <span className="material-icons">arrow_forward</span>
            </button>
          </div>
          <div className="highlight-image">
            <div className="image-card">
              <img src="https://placehold.co/600x400/f1f3f4/5f6368?text=Feature+Preview" alt="AssetX in action" />
              <div className="image-card-pattern"></div>
            </div>
            <div className="image-card-glow"></div>
          </div>
        </div>
      </div>
      
      <div className="features-divider">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 30" preserveAspectRatio="none">
          <path d="M0,0 C300,30 900,30 1200,0 L1200,30 L0,30 Z" fill="#f8fafc"></path>
        </svg>
      </div>
    </section>
  );
};

export default FeatureSection;
