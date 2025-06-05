from fastapi import WebSocket, WebSocketDisconnect, APIRouter
import websockets
import asyncio
import os
import json

router = APIRouter()

# WebRTC signaling bridge endpoint
@router.websocket("/rtc-signal")
async def rtc_signal(websocket: WebSocket):
    await websocket.accept()
    # Connect to OpenAI Realtime API as a signaling peer
    async with websockets.connect(
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
        extra_headers={
            "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
            "OpenAI-Beta": "realtime=v1"
        }
    ) as openai_ws:
        # Send session config as the first message
        with open("backend/solace_session_config.json") as f:
            session_config = json.load(f)
        await openai_ws.send(json.dumps(session_config))

        async def client_to_openai():
            try:
                while True:
                    msg = await websocket.receive_text()
                    # Forward SDP/ICE messages from client to OpenAI
                    await openai_ws.send(msg)
            except WebSocketDisconnect:
                pass

        async def openai_to_client():
            try:
                while True:
                    msg = await openai_ws.recv()
                    # Forward SDP/ICE messages from OpenAI to client
                    await websocket.send_text(msg)
            except Exception:
                pass

        # Run both directions concurrently
        await asyncio.gather(client_to_openai(), openai_to_client())


