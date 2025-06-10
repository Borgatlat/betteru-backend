# BetterU Backend - Speech-to-Speech Agent

A real-time speech-to-speech agent using OpenAI's Realtime API.

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/betteru-backend.git
cd betteru-backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

## Environment Variables

Create a `.env` file with the following variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `EXPO_PUBLIC_SIGNAL_WS_URL`: WebSocket URL for your server
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)

## Running the Server

Development:
```bash
uvicorn backend.main:app --reload
```

Production:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Deployment

1. Set up your production environment variables on your hosting platform
2. Deploy using your preferred hosting service (e.g., Heroku, DigitalOcean, AWS)
3. Update the `EXPO_PUBLIC_SIGNAL_WS_URL` in your frontend to point to your production server

## Security Notes

- Never commit `.env` file to version control
- Keep your OpenAI API key secure
- Use environment variables for all sensitive data
- Enable CORS only for trusted domains in production

## API Endpoints

- `GET /health`: Health check endpoint
- `GET /start-solace-session`: Start a new session
- `WS /rtc-signal`: WebSocket endpoint for real-time communication 