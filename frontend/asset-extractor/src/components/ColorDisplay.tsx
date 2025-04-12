import { useState } from 'react';
import { ColorCollection, ColorInfo } from '../api/extractorApi';
import './ColorDisplay.css';

interface ColorDisplayProps {
  colors: ColorCollection;
}

const ColorSwatch = ({ color }: { color: ColorInfo }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const textColor = isLightColor(color.rgb) ? '#000000' : '#FFFFFF';
  
  // Determine color rank
  const getColorRankLabel = () => {
    if (color.percentage && color.percentage > 30) return 'Primary';
    if (color.percentage && color.percentage > 15) return 'Secondary';
    if (color.percentage && color.percentage > 5) return 'Tertiary';
    if (color.count && color.count > 20) return 'Primary';
    if (color.count && color.count > 10) return 'Secondary';
    if (color.count && color.count > 5) return 'Tertiary';
    return '';
  };
  
  const colorRank = getColorRankLabel();

  return (
    <div className="color-swatch">
      <div 
        className="color-preview" 
        style={{ 
          backgroundColor: color.hex,
          color: textColor 
        }}
        onClick={() => copyToClipboard(color.hex)}
      >
        {copied ? 'Copied!' : color.hex}
        
        {/* Add rank badge if applicable */}
        {colorRank && (
          <span className="color-rank">{colorRank}</span>
        )}
      </div>
      <div className="color-info">
        <h4>{color.name}</h4>
        <p>RGB: {color.rgb.join(', ')}</p>
        <div className="color-metrics">
          {color.percentage !== null && color.percentage !== undefined && (
            <span className="color-percentage">Usage: {color.percentage.toFixed(1)}%</span>
          )}
          {color.count !== null && color.count !== undefined && (
            <span className="color-count">Frequency: {color.count}</span>
          )}
        </div>
        {color.source && (
          <a 
            href={color.source} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="source-link"
          >
            Source
          </a>
        )}
      </div>
    </div>
  );
};

// Helper function to determine if a color is light or dark
const isLightColor = (rgb: number[]): boolean => {
  // Formula: Luminance = 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5;
};

const ColorDisplay = ({ colors }: ColorDisplayProps) => {
  const [activeSection, setActiveSection] = useState<'css' | 'images' | 'all'>('all');
  
  // Filter colors based on active section
  const colorsToShow = activeSection === 'css' 
    ? colors.from_css
    : activeSection === 'images' 
      ? colors.from_images 
      : [...colors.from_css, ...colors.from_images];

  return (
    <div className="color-display">
      <div className="color-section-tabs">
        <button 
          className={`section-tab ${activeSection === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSection('all')}
        >
          All Colors
        </button>
        <button 
          className={`section-tab ${activeSection === 'css' ? 'active' : ''}`}
          onClick={() => setActiveSection('css')}
        >
          CSS Colors ({colors.from_css.length})
        </button>
        <button 
          className={`section-tab ${activeSection === 'images' ? 'active' : ''}`}
          onClick={() => setActiveSection('images')}
        >
          Image Colors ({colors.from_images.length})
        </button>
      </div>

      {colorsToShow.length === 0 ? (
        <p className="no-results">No colors found in this section.</p>
      ) : (
        <div className="color-grid">
          {colorsToShow.map((color, index) => (
            <ColorSwatch key={`${color.hex}-${index}`} color={color} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorDisplay;
