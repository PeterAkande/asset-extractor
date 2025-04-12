# Web Assets Extractor

A powerful tool for extracting colors, fonts, and assets from any website. This application provides a beautiful and intuitive interface to analyze web design elements and extract them for your own use.

## Features

- Extract color palettes from CSS and images
- Identify fonts used on websites, including Google Fonts
- Download and view all images from a website
- Copy color codes with a single click
- Download color palettes as image files

## Project Structure

The project is divided into two main parts:

- **Backend**: FastAPI application for web scraping and asset extraction
- **Frontend**: React application with Vite for displaying the results

## Tech Stack

### Backend
- FastAPI
- BeautifulSoup4
- Pillow
- extcolors
- httpx

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- file-saver
- html2canvas

## Setup

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. Clone this repository
2. Install backend dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```
3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

## Running the Application

You can run both the frontend and backend with a single command:

```
./development.sh
```

Or you can run them separately:

### Backend
```
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```
cd frontend
npm run dev
```

## Usage

1. Open the application in your browser (typically http://localhost:5173)
2. Enter a website URL in the input field
3. Click "Extract Assets"
4. Browse through the extracted colors, fonts, and images
5. Download or copy any elements you want to use

## API Endpoints

- `POST /api/extract`: Extract assets from a URL
  - Request body: `{"url": "https://example.com"}`
  - Response: JSON with colors, fonts, and assets

## License

MIT