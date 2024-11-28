import WebSocket from 'ws';
import { GamepadEvent } from '../types.js';

export class WebSocketHandler {
  private ws: WebSocket | null = null;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  private readonly WS_URL: string;

  constructor(wsUrl: string) {
    this.WS_URL = wsUrl;
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.error('WebSocket is already connected');
      return;
    }

    console.error(`Connecting to WebSocket server at ${this.WS_URL}...`);
    
    try {
      this.ws = new WebSocket(this.WS_URL, {
        handshakeTimeout: 5000,
      });

      this.setupWebSocketListeners();
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.setupReconnection();
    }
  }

  private setupWebSocketListeners(): void {
    if (!this.ws) return;

    this.ws.on('open', this.handleOpen.bind(this));
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
  }

  private handleOpen(): void {
    console.error('Connected to WebSocket server successfully');
    if (this.wsReconnectInterval) {
      clearInterval(this.wsReconnectInterval);
      this.wsReconnectInterval = null;
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      console.error('Received WebSocket message:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      console.error('Raw message:', data.toString());
    }
  }

  private handleClose(code: number, reason: string): void {
    console.error(`WebSocket connection closed with code ${code} and reason: ${reason}`);
    this.ws = null;
    this.setupReconnection();
  }

  private handleError(error: Error): void {
    console.error('WebSocket error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('Connection refused. Is the WebSocket server running?');
    }
  }

  private setupReconnection(): void {
    if (!this.wsReconnectInterval) {
      this.wsReconnectInterval = setInterval(() => {
        console.error('Attempting to reconnect...');
        this.connect();
      }, 5000);
    }
  }

  public send(event: GamepadEvent | GamepadEvent[]): void {
    if (!this.ws) {
      console.error('WebSocket is not initialized');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error(`WebSocket is not open (current state: ${this.ws.readyState})`);
      return;
    }

    try {
      const events = Array.isArray(event) ? event : [event];
      const message = JSON.stringify({ events });
      console.error('Sending to WebSocket:', message);
      this.ws.send(message);
    } catch (error) {
      console.error('Error sending to WebSocket:', error);
    }
  }
} 