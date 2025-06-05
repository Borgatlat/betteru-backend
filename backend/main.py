from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import openai
import websockets
import json
import os
from app.backend.hooks.ws_bridge import router as ws_router  # Import the WebSocket bridge router

app = FastAPI()

# Allow requests from your app (for development, allow all)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the WebSocket bridge router for speech-to-speech
app.include_router(ws_router)

# Initialize OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")

# Load session config from JSON file
SESSION_CONFIG_PATH = os.path.join(os.path.dirname(__file__), '../../backend/solace_session_config.json')
with open(SESSION_CONFIG_PATH, 'r') as f:
    session_config = json.load(f)

# Async function to connect to OpenAI Realtime API and send session update
def get_openai_headers():
    return {
        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
        "OpenAI-Beta": "realtime=v1"
    }

async def connect_and_send_session_update():
    url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
    async with websockets.connect(url, extra_headers=get_openai_headers()) as ws:
        await ws.send(json.dumps(session_config))
        # You can now continue to send/receive events as needed
        # For demonstration, just receive the first message
        response = await ws.recv()
        return response

# FastAPI route to trigger the connection (for testing)
@app.get("/start-solace-session")
async def start_solace_session():
    response = await connect_and_send_session_update()
    return {"openai_response": response}
