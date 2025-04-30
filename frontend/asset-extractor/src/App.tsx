import { Routes, Route} from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExtractPage from './pages/ExtractPage';
import ResultsPage from './pages/ResultsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/extract" element={<ExtractPage />} />
      <Route path="/result/:resultId" element={<ResultsPage />} />
      
      {/* Additional routes could be added here */}
      <Route path="/about" element={<div>About page coming soon</div>} />
      <Route path="/docs" element={<div>Documentation coming soon</div>} />
      <Route path="/pricing" element={<div>Pricing information coming soon</div>} />
      <Route path="/contact" element={<div>Contact page coming soon</div>} />
      
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
