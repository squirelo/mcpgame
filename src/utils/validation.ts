import { GamepadEvent, EventType, ButtonCode, AxisCode, TriggerCode, MouseButtonCode, KeyboardCode } from '../types.js';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export function validateEvent(event: any): GamepadEvent {
  if (!event || typeof event !== 'object') {
    throw new McpError(ErrorCode.InvalidParams, 'Event must be an object');
  }

  if (!event.type || !Object.values(EventType).includes(event.type)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid event type: ${event.type}. Must be one of: ${Object.values(EventType).join(', ')}`
    );
  }

  if (!event.code) {
    throw new McpError(ErrorCode.InvalidParams, 'Event code is required');
  }

  // Validate code based on event type
  switch (event.type) {
    case EventType.button:
      if (!Object.values(ButtonCode).includes(event.code)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid button code: ${event.code}. Must be one of: ${Object.values(ButtonCode).join(', ')}`
        );
      }
      if (typeof event.value !== 'boolean') {
        throw new McpError(ErrorCode.InvalidParams, 'Button value must be boolean');
      }
      break;

    case EventType.axis:
      if (!Object.values(AxisCode).includes(event.code)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid axis code: ${event.code}. Must be one of: ${Object.values(AxisCode).join(', ')}`
        );
      }
      validateAnalogValue(event.value);
      break;

    case EventType.trigger:
      if (!Object.values(TriggerCode).includes(event.code)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid trigger code: ${event.code}. Must be one of: ${Object.values(TriggerCode).join(', ')}`
        );
      }
      validateAnalogValue(event.value);
      break;

    case EventType.mouseButton:
      if (!Object.values(MouseButtonCode).includes(event.code)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid mouse button code: ${event.code}. Must be one of: ${Object.values(MouseButtonCode).join(', ')}`
        );
      }
      if (typeof event.value !== 'boolean') {
        throw new McpError(ErrorCode.InvalidParams, 'Mouse button value must be boolean');
      }
      break;

    case EventType.keyboard:
      if (!Object.values(KeyboardCode).includes(event.code)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid keyboard code: ${event.code}. Must be one of: ${Object.values(KeyboardCode).join(', ')}`
        );
      }
      if (typeof event.value !== 'boolean') {
        throw new McpError(ErrorCode.InvalidParams, 'Keyboard value must be boolean');
      }
      break;
  }

  return event as GamepadEvent;
}

function validateAnalogValue(value: any): void {
  if (typeof value !== 'number' || value < -1 || value > 1) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Analog value must be a number between -1 and 1'
    );
  }
} 