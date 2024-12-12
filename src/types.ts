import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import WebSocket from 'ws';

// Event type definitions
export enum ButtonCode {
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
  DPAD_RIGHT = 'DPAD_RIGHT'
}

export enum AxisCode {
  leftX = 'leftX',
  leftY = 'leftY',
  rightX = 'rightX',
  rightY = 'rightY'
}

export enum TriggerCode {
  leftTrigger = 'leftTrigger',
  rightTrigger = 'rightTrigger'
}

export enum MouseButtonCode {
  leftClick = 'leftClick',
  rightClick = 'rightClick',
  middleClick = 'middleClick'
}

export enum KeyboardCode {
  space = 'space'
}

export enum EventType {
  button = 'button',
  axis = 'axis',
  trigger = 'trigger',
  mouseButton = 'mouseButton',
  keyboard = 'keyboard'
}

export type GamepadEvent = {
  type: EventType;
  code: ButtonCode | AxisCode | TriggerCode | MouseButtonCode | KeyboardCode;
  value: boolean | number;
}

export const VALID_BUTTON_EVENTS = Object.values(ButtonCode);
export const VALID_SLIDER_EVENTS = [...Object.values(AxisCode), ...Object.values(TriggerCode)];

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