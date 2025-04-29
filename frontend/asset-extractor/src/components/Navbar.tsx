import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  onLogoClick: () => void;
}

const Navbar = ({ onLogoClick }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Handle scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Prevent body scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar-container">
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
                className={`nav-button ${location.pathname === "/" ? 'active' : ''}`}
                onClick={() => handleNavigation('/')}
              >
                <span className="nav-button-icon">🏠</span>
                Home
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-button ${location.pathname === "/extract" ? 'active' : ''}`}
                onClick={() => handleNavigation('/extract')}
              >
                <span className="nav-button-icon">🔍</span>
                Extract
              </button>
            </li>
            <li className="nav-item">
              <a href="#" className="nav-link highlight">
                <span className="nav-button-icon">✨</span>
                Try Pro
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
