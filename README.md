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