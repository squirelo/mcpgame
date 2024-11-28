#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import WebSocket from 'ws';

// Define valid event types
const VALID_BUTTON_EVENTS = [
  { type: "button", code: "A" },
  { type: "button", code: "B" },
  { type: "button", code: "X" },
  { type: "button", code: "Y" },
  { type: "button", code: "LEFT_SHOULDER" },
  { type: "button", code: "RIGHT_SHOULDER" },
  { type: "button", code: "LEFT_THUMB" },
  { type: "button", code: "RIGHT_THUMB" },
  { type: "button", code: "BACK" },
  { type: "button", code: "START" },
  { type: "button", code: "GUIDE" },
  { type: "button", code: "DPAD_UP" },
  { type: "button", code: "DPAD_DOWN" },
  { type: "button", code: "DPAD_LEFT" },
  { type: "button", code: "DPAD_RIGHT" },
  { type: "keyboard", code: "space" },
  { type: "mouseButton", code: "leftClick" },
  { type: "mouseButton", code: "rightClick" },
  { type: "mouseButton", code: "middleClick" }
] as const;

const VALID_SLIDER_EVENTS = [
  { type: "axis", code: "leftX" },
  { type: "axis", code: "leftY" },
  { type: "axis", code: "rightX" },
  { type: "axis", code: "rightY" },
  { type: "trigger", code: "leftTrigger" },
  { type: "trigger", code: "rightTrigger" }
] as const;

// Create type from valid events
type ValidButtonEvent = typeof VALID_BUTTON_EVENTS[number] & { value: boolean };
type ValidSliderEvent = typeof VALID_SLIDER_EVENTS[number] & { value: number };
type GamepadEvent = ValidButtonEvent | ValidSliderEvent;

interface EventMessage {
  events: GamepadEvent[];
}

function isValidButtonCode(type: string, code: string): boolean {
  return VALID_BUTTON_EVENTS.some(event => event.type === type && event.code === code);
}

function isValidSliderCode(type: string, code: string): boolean {
  return VALID_SLIDER_EVENTS.some(event => event.type === type && event.code === code);
}

function validateEvent(event: any): GamepadEvent {
  if (typeof event !== 'object' || event === null) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid event format: event must be an object'
    );
  }

  if (typeof event.type !== 'string' || typeof event.code !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid event format: type and code must be strings'
    );
  }

  // Validate button events
  if (['button', 'mouseButton', 'keyboard'].includes(event.type)) {
    if (!isValidButtonCode(event.type, event.code)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid ${event.type} code: ${event.code}`
      );
    }
    if (typeof event.value !== 'boolean') {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid value for ${event.type}: must be boolean`
      );
    }
    return event as ValidButtonEvent;
  }

  // Validate slider/axis events
  if (['axis', 'trigger'].includes(event.type)) {
    if (!isValidSliderCode(event.type, event.code)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid ${event.type} code: ${event.code}`
      );
    }
    if (typeof event.value !== 'number' || event.value < -1 || event.value > 1) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid value for ${event.type}: must be number between -1 and 1`
      );
    }
    return event as ValidSliderEvent;
  }

  throw new McpError(
    ErrorCode.InvalidParams,
    `Invalid event type: ${event.type}`
  );
}

class GamepadServer {
  private server: Server;
  private lastEvents: GamepadEvent[] = [];
  private ws: WebSocket | null = null;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  private readonly WS_URL = 'ws://127.0.0.1:13123';

  constructor() {
    this.server = new Server({
      name: "gamepad-server",
      version: "0.1.0"
    }, {
      capabilities: {
        resources: {},
        tools: {}
      }
    });

    this.setupHandlers();
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.error('WebSocket is already connected');
      return;
    }

    console.error(`Connecting to WebSocket server at ${this.WS_URL}...`);
    
    try {
      this.ws = new WebSocket(this.WS_URL, {
        handshakeTimeout: 5000,
      });

      this.ws.on('open', () => {
        console.error('Connected to WebSocket server successfully');
        if (this.wsReconnectInterval) {
          clearInterval(this.wsReconnectInterval);
          this.wsReconnectInterval = null;
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.error('Received WebSocket message:', JSON.stringify(message, null, 2));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          console.error('Raw message:', data.toString());
        }
      });

      this.ws.on('close', (code, reason) => {
        console.error(`WebSocket connection closed with code ${code} and reason: ${reason}`);
        this.ws = null;
        if (!this.wsReconnectInterval) {
          this.wsReconnectInterval = setInterval(() => {
            console.error('Attempting to reconnect...');
            this.connectWebSocket();
          }, 5000);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        if (error.message.includes('ECONNREFUSED')) {
          console.error('Connection refused. Is the WebSocket server running?');
        }
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      if (!this.wsReconnectInterval) {
        this.wsReconnectInterval = setInterval(() => {
          console.error('Attempting to reconnect...');
          this.connectWebSocket();
        }, 5000);
      }
    }
  }

  private sendToWebSocket(event: GamepadEvent | GamepadEvent[]): void {
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

  private setupHandlers(): void {
    // Resource handlers
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => ({
        resources: [
          {
            uri: "gamepad://events",
            name: "Gamepad Events",
            mimeType: "application/json",
            description: "Current gamepad event state"
          },
          {
            uri: "gamepad://valid-events",
            name: "Valid Gamepad Events",
            mimeType: "application/json",
            description: "List of all valid gamepad events"
          }
        ]
      })
    );

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        switch (request.params.uri) {
          case "gamepad://events":
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify({ events: this.lastEvents }, null, 2)
              }]
            };
          case "gamepad://valid-events":
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  buttonEvents: VALID_BUTTON_EVENTS,
                  sliderEvents: VALID_SLIDER_EVENTS
                }, null, 2)
              }]
            };
          default:
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Unknown resource: ${request.params.uri}`
            );
        }
      }
    );

    // Tool handlers
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: [
          {
            name: "send_gamepad_event",
            description: `Send gamepad events to control the game. Supported events:
            
            Button Events (value must be boolean):
            - Standard buttons: A, B, X, Y
            - Shoulder buttons: LEFT_SHOULDER (LB), RIGHT_SHOULDER (RB)
            - Thumb buttons: LEFT_THUMB (L3), RIGHT_THUMB (R3)
            - Special buttons: BACK, START, GUIDE
            - D-pad: DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT
            
            Mouse Events (value must be boolean):
            - leftClick, rightClick, middleClick
            
            Keyboard Events (value must be boolean):
            - space
            
            Analog Events (value must be number between -1 and 1):
            - Sticks: leftX, leftY, rightX, rightY
            - Triggers: leftTrigger, rightTrigger`,
            inputSchema: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  description: "Array of gamepad events to send",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["button", "axis", "trigger", "mouseButton", "keyboard"],
                        description: `Event type:
                        - "button": Gamepad buttons (A, B, X, Y, etc.)
                        - "axis": Analog sticks (leftX, leftY, rightX, rightY)
                        - "trigger": Analog triggers (leftTrigger, rightTrigger)
                        - "mouseButton": Mouse buttons (leftClick, rightClick, middleClick)
                        - "keyboard": Keyboard keys (space)`
                      },
                      code: { 
                        type: "string",
                        description: "Event code (e.g., 'A' for A button, 'leftX' for left stick X axis)"
                      },
                      value: {
                        type: ["boolean", "number"],
                        description: `Event value:
                        - For buttons/mouse/keyboard: boolean (true for press, false for release)
                        - For axes/triggers: number between -1 and 1`
                      }
                    },
                    required: ["type", "code", "value"]
                  }
                }
              },
              required: ["events"]
            },
            examples: [
              {
                name: "Press A button",
                parameters: {
                  events: [
                    { type: "button", code: "A", value: true }
                  ]
                }
              },
              {
                name: "Move left stick",
                parameters: {
                  events: [
                    { type: "axis", code: "leftX", value: 0.5 },
                    { type: "axis", code: "leftY", value: -0.5 }
                  ]
                }
              },
              {
                name: "Multiple button combination",
                parameters: {
                  events: [
                    { type: "button", code: "LEFT_SHOULDER", value: true },
                    { type: "button", code: "A", value: true }
                  ]
                }
              },
              {
                name: "Mouse click",
                parameters: {
                  events: [
                    { type: "mouseButton", code: "leftClick", value: true }
                  ]
                }
              },
              {
                name: "Press space",
                parameters: {
                  events: [
                    { type: "keyboard", code: "space", value: true }
                  ]
                }
              }
            ]
          }
        ]
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        switch (request.params.name) {
          case "send_gamepad_event": {
            const args = request.params.arguments as unknown as Record<string, unknown>;
            if (!args || !('events' in args) || !Array.isArray(args.events)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid event message format: missing or invalid events array'
              );
            }

            // Validate each event
            const validatedEvents = args.events.map(validateEvent);
            
            console.error('Received MCP event:', JSON.stringify({ events: validatedEvents }, null, 2));
            this.lastEvents = validatedEvents;
            this.sendToWebSocket(validatedEvents);
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ 
                  success: true, 
                  eventsReceived: validatedEvents.length,
                  message: "Events validated and sent successfully"
                })
              }]
            };
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Gamepad MCP server running on stdio");
  }
}

const server = new GamepadServer();
server.run().catch(console.error); 