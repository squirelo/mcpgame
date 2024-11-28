import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import WebSocket from 'ws';

// Event type definitions
export const VALID_BUTTON_EVENTS = [
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

export const VALID_SLIDER_EVENTS = [
  { type: "axis", code: "leftX" },
  { type: "axis", code: "leftY" },
  { type: "axis", code: "rightX" },
  { type: "axis", code: "rightY" },
  { type: "trigger", code: "leftTrigger" },
  { type: "trigger", code: "rightTrigger" }
] as const;

export type ValidButtonEvent = typeof VALID_BUTTON_EVENTS[number] & { value: boolean };
export type ValidSliderEvent = typeof VALID_SLIDER_EVENTS[number] & { value: number };
export type GamepadEvent = ValidButtonEvent | ValidSliderEvent;

export interface EventMessage {
  events: GamepadEvent[];
}

export interface GamepadServerInterface {
  server: Server;
  lastEvents: GamepadEvent[];
  ws: WebSocket | null;
  wsReconnectInterval: NodeJS.Timeout | null;
  readonly WS_URL: string;
} 