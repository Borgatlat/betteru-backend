import { useRef, useState, useCallback } from 'react';
import { RTCPeerConnection, mediaDevices } from 'react-native-webrtc';

// Set your backend WebSocket signaling endpoint
const SIGNAL_WS_URL = process.env.EXPO_PUBLIC_SIGNAL_WS_URL || 'ws://localhost:8000/rtc-signal';

export default function useRealtimeOpenAI() {
  const pcRef = useRef(null); // Peer connection instance
  const wsRef = useRef(null); // WebSocket for signaling
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(true); // Start muted
  const [dataChannel, setDataChannel] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Handle incoming signaling messages from backend
  const handleSignalMessage = useCallback(async (msg, pc) => {
    const data = JSON.parse(msg);
    if (data.type === 'answer') {
      await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    } else if (data.type === 'candidate') {
      await pc.addIceCandidate(data);
    }
  }, []);

  // Connect to backend signaling server and start WebRTC
  const connect = useCallback(async () => {
    if (pcRef.current || wsRef.current) return; // Prevent duplicate connections

    // 1. Create a new RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    // 2. Get user media (microphone audio)
    const stream = await mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // 3. Create a data channel for events (optional)
    const dc = pc.createDataChannel('oai-events');
    setDataChannel(dc);

    // 4. Set up signaling WebSocket
    const ws = new WebSocket(SIGNAL_WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      // 5. Create and send SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
    };

    ws.onmessage = async (event) => {
      await handleSignalMessage(event.data, pc);
    };

    ws.onclose = () => {
      disconnect();
    };

    ws.onerror = (err) => {
      console.error('Signaling WebSocket error:', err);
      disconnect();
    };

    // 6. Send ICE candidates to backend as they are found
    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'candidate', ...event.candidate }));
      }
    };

    // 7. Play the assistant's audio as soon as the first packet lands
    pc.ontrack = (event) => {
      setThinking(false);
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
    };

    setThinking(true); // Show the pulsing indicator
    setMuted(false); // Ensure muted state is in sync
  }, [handleSignalMessage]);

  // Disconnect and clean up the peer/WebSocket
  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setThinking(false);
    setMuted(true);
    setDataChannel(null);
    setRemoteStream(null);
  }, []);

  // Toggle mute state and manage connection
  const toggleMute = useCallback(() => {
    if (muted) {
      connect(); // Start streaming
    } else {
      disconnect(); // Stop streaming
    }
    setMuted((prev) => !prev);
  }, [muted, connect, disconnect]);

  return {
    connect,
    disconnect,
    thinking,
    muted,
    toggleMute,
    dataChannel,
    remoteStream,
  };
}