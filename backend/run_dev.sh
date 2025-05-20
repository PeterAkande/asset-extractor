#!/bin/bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.root.app:app --reload --port 8000
