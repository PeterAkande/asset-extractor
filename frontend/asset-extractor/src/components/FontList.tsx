import { FontInfo, getGoogleFontUrl } from '../api/extractorApi';
import './FontList.css';

interface FontListProps {
  fonts: FontInfo[];
}

const FontList = ({ fonts }: FontListProps) => {
  if (fonts.length === 0) {
    return <p className="no-results">No fonts found on this page.</p>;
  }

  const getGoogleFontImportLink = (fontName: string) => {
    const formatted = fontName.replace(/\s+/g, '+');
    return `@import url('https://fonts.googleapis.com/css2?family=${formatted}&display=swap');`;
  };

  // Group fonts by type
  const fontsByType = fonts.reduce((acc, font) => {
    const type = font.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(font);
    return acc;
  }, {} as Record<string, FontInfo[]>);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(text);
    const target = e.currentTarget as HTMLElement;
    const originalText = target.textContent;
    target.textContent = 'Copied!';
    setTimeout(() => {
      if (originalText) target.textContent = originalText;
    }, 1500);
  };

  return (
    <div className="font-list">
      {Object.entries(fontsByType).map(([type, typeFonts]) => (
        <div key={type} className="font-group">
          <h3 className="font-type-title">{type}</h3>
          <div className="fonts-container">
            {typeFonts.map((font) => (
              <div key={`${font.name}-${type}`} className="font-card">
                <div className="font-preview">
                  <h4>{font.name}</h4>
                  <p className="sample-text">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                  <p className="sample-text">abcdefghijklmnopqrstuvwxyz</p>
                  <p className="sample-text">0123456789</p>
                </div>
                <div className="font-actions">
                  {type.includes('Google') && (
                    <>
                      <a 
                        href={getGoogleFontUrl(font.name)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-link"
                      >
                        View on Google Fonts
                      </a>
                      <button 
                        className="copy-code-btn"
                        onClick={(e) => copyToClipboard(getGoogleFontImportLink(font.name), e)}
                      >
                        Copy Import Code
                      </button>
                    </>
                  )}
                  {!type.includes('Google') && (
                    <p className="font-note">
                      This is a {type.toLowerCase()} font. It may require custom integration.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FontList;
