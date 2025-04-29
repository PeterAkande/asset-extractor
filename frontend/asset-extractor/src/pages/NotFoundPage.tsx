import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const NotFoundPage = () => {
  const navigate = useNavigate();
  
  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="not-found-page">
      <Navbar onLogoClick={handleLogoClick} />
      
      <div className="container" style={{ 
        paddingTop: '150px', 
        paddingBottom: '150px',
        textAlign: 'center',
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>404</h1>
        <h2 style={{ marginBottom: '2rem' }}>Page Not Found</h2>
        <p style={{ marginBottom: '3rem', maxWidth: '500px', color: '#5F6368' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button 
          className="primary-button" 
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span className="material-icons">home</span>
          Return to Home
        </button>
      </div>
      
      <Footer />
    </div>
  );
};

export default NotFoundPage;
