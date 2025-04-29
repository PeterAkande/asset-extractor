import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeatureSection from '../components/FeatureSection';
import TestimonialSection from '../components/TestimonialSection';
import Footer from '../components/Footer';

const HomePage = () => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    navigate('/extract');
  };
  
  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="home-page">
      <Navbar onLogoClick={handleLogoClick} />
      <HeroSection onGetStarted={handleGetStarted} />
      <FeatureSection />
      <TestimonialSection />
      <Footer />
    </div>
  );
};

export default HomePage;
