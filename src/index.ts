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

enum ButtonCode {
  A = 'A',
  B = 'B',
  X = 'X',
  Y = 'Y',
  LEFT_SHOULDER = 'LEFT_SHOULDER',
  RIGHT_SHOULDER = 'RIGHT_SHOULDER',
  LEFT_THUMB = 'LEFT_THUMB',
  RIGHT_THUMB = 'RIGHT_THUMB',
  BACK = 'BACK',
  START = 'START',
  GUIDE = 'GUIDE',
  DPAD_UP = 'DPAD_UP',
  DPAD_DOWN = 'DPAD_DOWN',
  DPAD_LEFT = 'DPAD_LEFT',
  DPAD_RIGHT = 'DPAD_RIGHT',
  LEFT_STICK_UP = 'LEFT_STICK_UP',
  LEFT_STICK_DOWN = 'LEFT_STICK_DOWN',
  LEFT_STICK_LEFT = 'LEFT_STICK_LEFT',
  LEFT_STICK_RIGHT = 'LEFT_STICK_RIGHT',
  RIGHT_STICK_UP = 'RIGHT_STICK_UP',
  RIGHT_STICK_DOWN = 'RIGHT_STICK_DOWN',
  RIGHT_STICK_LEFT = 'RIGHT_STICK_LEFT',
  RIGHT_STICK_RIGHT = 'RIGHT_STICK_RIGHT'
}

enum AxisCode {
  leftX = 'leftX',
  leftY = 'leftY',
  rightX = 'rightX',
  rightY = 'rightY',
  dpadHorz = 'dpadHorz',
  dpadVert = 'dpadVert'
}

enum TriggerCode {
  leftTrigger = 'leftTrigger',
  rightTrigger = 'rightTrigger'
}

enum MouseButtonCode {
  leftClick = 'leftClick',
  rightClick = 'rightClick',
  middleClick = 'middleClick'
}

enum KeyboardCode {
  a = 'a', b = 'b', c = 'c', // ... through z
  num0 = '0', num1 = '1', // ... through 9
  numpad_0 = 'numpad_0', numpad_1 = 'numpad_1', // ... through numpad_9
  backspace = 'backspace',
  delete = 'delete',
  enter = 'enter',
  tab = 'tab',
  escape = 'escape',
  up = 'up',
  down = 'down',
  left = 'left',
  right = 'right',
  home = 'home',
  end = 'end',
  pageup = 'pageup',
  pagedown = 'pagedown',
  f1 = 'f1', // ... through f12
  alt = 'alt',
  control = 'control',
  shift = 'shift',
  space = 'space',
  windows = 'windows',
  play = 'play',
  pause = 'pause',
  mute = 'mute',
  fn = 'fn'
}

enum EventType {
  button = 'button',
  axis = 'axis',
  trigger = 'trigger',
  mouseButton = 'mouseButton',
  keyboard = 'keyboard'
}

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
          description: `Send gamepad events to control the game.`,
          inputSchema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: Object.values(EventType),
                    },
                    code: {
                      type: "string",
                      enum: [
                        ...Object.values(ButtonCode),
                        ...Object.values(AxisCode),
                        ...Object.values(TriggerCode),
                        ...Object.values(MouseButtonCode),
                        ...Object.values(KeyboardCode)
                      ]
                    },
                    value: {
                      type: "number",
                      description: "Event value"
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
                  { type: "button", code: "A", value: 1 }
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
              name: "Press shoulder buttons",
              parameters: {
                events: [
                  { type: "button", code: "LEFT_SHOULDER", value: 1 },
                  { type: "button", code: "RIGHT_SHOULDER", value: 1 }
                ]
              }
            },
            {
              name: "Mouse click",
              parameters: {
                events: [
                  { type: "mouseButton", code: "leftClick", value: 1 }
                ]
              }
            },
            {
              name: "Press space",
              parameters: {
                events: [
                  { type: "keyboard", code: "space", value: 1 }
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
        
        validatedEvents.forEach(event => {
          switch (event.type) {
            case EventType.button:
            case EventType.mouseButton:
            case EventType.keyboard:
              if (typeof event.value !== 'boolean') {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `${event.type} events require boolean values`
                );
              }
              break;
            case EventType.axis:
              if (typeof event.value !== 'number' || event.value < -1 || event.value > 1) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  'Axis values must be numbers between -1 and 1'
                );
              }
              break;
            case EventType.trigger:
              if (typeof event.value !== 'number' || event.value < 0 || event.value > 1) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  'Trigger values must be numbers between 0 and 1'
                );
              }
              break;
          }
        });

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