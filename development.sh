#!/bin/bash

# Colors for prettier output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting Web Assets Extractor Development Environment ===${NC}"

# Function to kill background processes on script exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up trap to catch ctrl+c and exit gracefully
trap cleanup SIGINT

# Start the backend server
echo -e "${BLUE}Starting backend server at http://localhost:8000${NC}"
cd backend && python -m uvicorn app.root.app:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment to ensure backend starts properly
sleep 2

# Start the frontend dev server with --host flag
echo -e "${BLUE}Starting frontend dev server${NC}"
cd frontend/asset-extractor && npm run dev -- --host &
FRONTEND_PID=$!

echo -e "${GREEN}Both servers are running!${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:8000"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for both processes to finish (which will be when user hits Ctrl+C)
wait