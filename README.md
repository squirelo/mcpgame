# Gamepad MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to control games through gamepad, keyboard, and mouse inputs.

## Overview

This server implements the [Model Context Protocol](https://modelcontextprotocol.io/) to allow AI assistants (like Claude) to send gamepad, keyboard, and mouse events to games. It acts as a bridge between the AI assistant and a WebSocket server that handles the actual input simulation.

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- [Claude Desktop](https://github.com/anthropic-labs/claude-desktop) (or another MCP-compatible client)
- A WebSocket server running on port 13123 to handle the input events

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/gamepad-mcp-server.git
   cd gamepad-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Configure Claude Desktop by adding the following to your config file:
   ```json
   {
     "servers": [
       {
         "name": "gamepad-server",
         "command": "node /absolute/path/to/gamepad-mcp-server/build/index.js"
       }
     ]
   }
   ```

5. Make the server executable:
   ```bash
   chmod +x build/index.js
   ```

## Event Format

Events are sent as JSON objects with the following structure: