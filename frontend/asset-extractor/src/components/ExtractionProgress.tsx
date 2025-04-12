import { ProgressEvent } from '../api/extractorApi';
import './ExtractionProgress.css';

interface ExtractionProgressProps {
  currentProgress: ProgressEvent | null;
}

const ExtractionProgress = ({ currentProgress }: ExtractionProgressProps) => {
  if (!currentProgress) return null;
  
  // Calculate overall progress percentage based on stage
  const getProgressPercentage = () => {
    const stages = [
      'fetching_page',
      'loading_page',
      'page_loaded',
      'parsing_content',
      'extracting_js_resources',
      'extracting_assets',
      'processing_resources',
      'assets_extracted',
      'extracting_colors',
      'colors_extracted',
      'extracting_fonts',
      'fonts_extracted',
      'extraction_complete'
    ];
    
    const currentStage = currentProgress.stage;
    if (!currentStage) return 10;
    
    const stageIndex = stages.indexOf(currentStage);
    if (stageIndex === -1) return 20;
    
    return Math.min(95, Math.round((stageIndex / (stages.length - 1)) * 100));
  };
  
  const getStageLabel = () => {
    switch (currentProgress.stage) {
      case 'fetching_page':
        return 'Fetching webpage...';
      case 'loading_page':
        return `Loading page content (${currentProgress.data?.strategy || 'standard'})...`;
      case 'page_loaded':
        return 'Page loaded, analyzing...';
      case 'parsing_content':
        return 'Parsing HTML content...';
      case 'extracting_js_resources':
        return 'Extracting JavaScript resources...';
      case 'extracting_assets':
        return 'Finding assets in the page...';
      case 'processing_resources':
        return 'Processing resources...';
      case 'assets_extracted':
        return `Assets found: ${currentProgress.data?.images || 0} images, ${currentProgress.data?.videos || 0} videos`;
      case 'extracting_colors':
        return 'Analyzing colors...';
      case 'colors_extracted':
        return `Found ${currentProgress.data?.count || 0} colors`;
      case 'extracting_fonts':
        return 'Detecting fonts...';
      case 'fonts_extracted':
        return `Found ${currentProgress.data?.count || 0} fonts`;
      case 'extraction_complete':
        return 'Extraction complete!';
      default:
        return 'Processing...';
    }
  };
  
  // Display different content based on event type
  if (currentProgress.event === 'error') {
    return (
      <div className="extraction-error">
        <div className="error-icon">❌</div>
        <h3>Extraction Failed</h3>
        <p>{currentProgress.message}</p>
      </div>
    );
  }
  
  if (currentProgress.event === 'start') {
    return (
      <div className="extraction-progress">
        <h3>Starting Extraction</h3>
        <p>Connecting to {currentProgress.url}</p>
        <div className="progress-spinner"></div>
      </div>
    );
  }
  
  if (currentProgress.event === 'progress') {
    const progressPercent = getProgressPercentage();
    
    return (
      <div className="extraction-progress">
        <h3>Extracting Assets</h3>
        <p>{getStageLabel()}</p>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="progress-percentage">{progressPercent}%</div>
      </div>
    );
  }
  
  return (
    <div className="extraction-progress">
      <div className="progress-spinner"></div>
      <p>Processing...</p>
    </div>
  );
};

export default ExtractionProgress;
