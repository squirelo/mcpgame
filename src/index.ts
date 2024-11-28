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

import { GamepadEvent, VALID_BUTTON_EVENTS, VALID_SLIDER_EVENTS } from "./types.js";
import { validateEvent } from "./utils/validation.js";
import { WebSocketHandler } from "./websocket/WebSocketHandler.js";

class GamepadServer {
  private server: Server;
  private lastEvents: GamepadEvent[] = [];
  private wsHandler: WebSocketHandler;

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

    this.wsHandler = new WebSocketHandler('ws://127.0.0.1:13123');
    this.setupHandlers();
    this.wsHandler.connect();
  }

  private setupHandlers(): void {
    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  private setupResourceHandlers(): void {
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
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools);
    this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  private async handleListTools() {
    return {
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
    };
  }

  private async handleCallTool(request: any) {
    switch (request.params.name) {
      case "send_gamepad_event": {
        const args = request.params.arguments as unknown as Record<string, unknown>;
        if (!args || !('events' in args) || !Array.isArray(args.events)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid event message format: missing or invalid events array'
          );
        }

        const validatedEvents = args.events.map(validateEvent);
        
        console.error('Received MCP event:', JSON.stringify({ events: validatedEvents }, null, 2));
        this.lastEvents = validatedEvents;
        this.wsHandler.send(validatedEvents);
        
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Gamepad MCP server running on stdio");
  }
}

const server = new GamepadServer();
server.run().catch(console.error); 