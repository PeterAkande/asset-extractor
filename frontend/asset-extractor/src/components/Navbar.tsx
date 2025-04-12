import { useState, useEffect } from 'react';
import './Navbar.css';

interface NavbarProps {
  onLogoClick: () => void;
}

const Navbar = ({ onLogoClick }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
      
      // Determine which section is currently in view
      const sections = ['features', 'testimonials', 'extraction-form'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const handleNavLinkClick = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <div className="navbar-logo" onClick={onLogoClick}>
          <div className="logo-mark">
            <span style={{ color: '#4285F4' }}>A</span>
            <span style={{ color: '#EA4335' }}>s</span>
            <span style={{ color: '#FBBC05' }}>s</span>
            <span style={{ color: '#34A853' }}>e</span>
            <span style={{ color: '#4285F4' }}>t</span>
            <span style={{ color: '#EA4335' }}>X</span>
          </div>
        </div>

        <button 
          className={`menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="navbar-nav">
            <li className="nav-item">
              <button 
                className={`nav-button ${activeSection === 'features' ? 'active' : ''}`}
                onClick={() => handleNavLinkClick('features')}
              >
                <span className="nav-button-icon">✨</span>
                Features
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-button ${activeSection === 'testimonials' ? 'active' : ''}`}
                onClick={() => handleNavLinkClick('testimonials')}
              >
                <span className="nav-button-icon">💬</span>
                Testimonials
              </button>
            </li>
            <li className="nav-item">
              <a href="#extraction-form" className="nav-link highlight">Try it free</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
