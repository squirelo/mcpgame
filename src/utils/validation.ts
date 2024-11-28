import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { 
  VALID_BUTTON_EVENTS, 
  VALID_SLIDER_EVENTS, 
  GamepadEvent 
} from "../types.js";

export function isValidButtonCode(type: string, code: string): boolean {
  return VALID_BUTTON_EVENTS.some(event => event.type === type && event.code === code);
}

export function isValidSliderCode(type: string, code: string): boolean {
  return VALID_SLIDER_EVENTS.some(event => event.type === type && event.code === code);
}

export function validateEvent(event: any): GamepadEvent {
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
    return event as GamepadEvent;
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
    return event as GamepadEvent;
  }

  throw new McpError(
    ErrorCode.InvalidParams,
    `Invalid event type: ${event.type}`
  );
} 