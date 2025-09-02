# MCP Server Setup Guide for Rocket.Chat

## Overview

Complete guide for setting up a Model Context Protocol (MCP) server to integrate with your self-hosted Rocket.Chat instance using Node.js SDK and Python implementations.

## Prerequisites

### System Requirements

- Node.js 18+ or Python 3.9+
- npm or yarn (for Node.js)
- pip (for Python)
- Git
- Docker (optional, for containerized deployment)

### Rocket.Chat Requirements

- Self-hosted Rocket.Chat instance (v4.0+)
- Admin access for creating service accounts
- Personal Access Token or OAuth app credentials
- Network access to Rocket.Chat server

## Node.js MCP Server Setup

### 1. Initialize Project

```bash
# Create project directory
mkdir rocket-chat-mcp-server
cd rocket-chat-mcp-server

# Initialize Node.js project
npm init -y

# Install MCP SDK and dependencies
npm install @modelcontextprotocol/sdk
npm install node-fetch ws dotenv
npm install --save-dev typescript @types/node @types/ws
```

### 2. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. MCP Server Implementation

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RocketChatClient } from './rocket-chat-client';

const server = new Server(
  {
    name: 'rocket-chat-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Rocket.Chat client
const rocketChat = new RocketChatClient({
  baseUrl: process.env.ROCKET_CHAT_URL!,
  userId: process.env.ROCKET_CHAT_USER_ID!,
  authToken: process.env.ROCKET_CHAT_AUTH_TOKEN!,
});

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_message',
        description: 'Send a message to a Rocket.Chat channel or user',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel name (#channel) or username (@user)',
            },
            text: {
              type: 'string',
              description: 'Message text to send',
            },
            threadId: {
              type: 'string',
              description: 'Optional thread ID to reply to',
            },
          },
          required: ['channel', 'text'],
        },
      },
      {
        name: 'list_channels',
        description: 'List available channels',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['public', 'private', 'direct'],
              description: 'Type of channels to list',
            },
          },
        },
      },
      {
        name: 'get_messages',
        description: 'Get messages from a channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel to get messages from',
            },
            count: {
              type: 'number',
              description: 'Number of messages to retrieve',
              default: 20,
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search for messages',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            roomId: {
              type: 'string',
              description: 'Optional room ID to search in',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_channel',
        description: 'Create a new channel',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Channel name',
            },
            members: {
              type: 'array',
              items: { type: 'string' },
              description: 'Initial members',
            },
            readOnly: {
              type: 'boolean',
              description: 'Make channel read-only',
              default: false,
            },
          },
          required: ['name'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'send_message':
        const messageResult = await rocketChat.sendMessage(
          args.channel as string,
          args.text as string,
          args.threadId as string | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully: ${messageResult.message._id}`,
            },
          ],
        };

      case 'list_channels':
        const channels = await rocketChat.listChannels(args.type as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(channels, null, 2),
            },
          ],
        };

      case 'get_messages':
        const messages = await rocketChat.getMessages(
          args.channel as string,
          args.count as number
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };

      case 'search_messages':
        const searchResults = await rocketChat.searchMessages(
          args.query as string,
          args.roomId as string | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(searchResults, null, 2),
            },
          ],
        };

      case 'create_channel':
        const channel = await rocketChat.createChannel(
          args.name as string,
          args.members as string[],
          args.readOnly as boolean
        );
        return {
          content: [
            {
              type: 'text',
              text: `Channel created: ${channel.channel.name}`,
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rocket.Chat MCP server running on stdio');
}

main().catch(console.error);
```

### 4. Rocket.Chat Client Implementation

```typescript
// src/rocket-chat-client.ts
import fetch from 'node-fetch';
import WebSocket from 'ws';

export class RocketChatClient {
  private baseUrl: string;
  private userId: string;
  private authToken: string;
  private ws?: WebSocket;

  constructor(config: {
    baseUrl: string;
    userId: string;
    authToken: string;
  }) {
    this.baseUrl = config.baseUrl;
    this.userId = config.userId;
    this.authToken = config.authToken;
  }

  private async request(endpoint: string, options: any = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      ...options,
      headers: {
        'X-Auth-Token': this.authToken,
        'X-User-Id': this.userId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || response.statusText);
    }

    return response.json();
  }

  async sendMessage(channel: string, text: string, threadId?: string) {
    return this.request('/chat.postMessage', {
      method: 'POST',
      body: JSON.stringify({
        channel,
        text,
        ...(threadId && { tmid: threadId }),
      }),
    });
  }

  async listChannels(type?: string) {
    const endpoints = {
      public: '/channels.list',
      private: '/groups.list',
      direct: '/im.list',
    };

    const endpoint = type ? endpoints[type] : '/rooms.get';
    return this.request(endpoint);
  }

  async getMessages(roomId: string, count: number = 20) {
    return this.request(`/channels.messages?roomId=${roomId}&count=${count}`);
  }

  async searchMessages(query: string, roomId?: string) {
    const params = new URLSearchParams({
      searchText: query,
      ...(roomId && { roomId }),
    });

    return this.request(`/chat.search?${params}`);
  }

  async createChannel(name: string, members?: string[], readOnly?: boolean) {
    return this.request('/channels.create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        members,
        readOnly,
      }),
    });
  }

  // WebSocket connection for real-time events
  connectWebSocket() {
    this.ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/websocket`);

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      this.authenticate();
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleWebSocketMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      setTimeout(() => this.connectWebSocket(), 5000);
    });
  }

  private authenticate() {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({
      msg: 'method',
      method: 'login',
      id: '1',
      params: [{
        resume: this.authToken,
      }],
    }));
  }

  private handleWebSocketMessage(message: any) {
    // Handle real-time messages
    console.log('WebSocket message:', message);
  }
}
```

### 5. Environment Configuration

```bash
# .env
ROCKET_CHAT_URL=https://your-rocket-chat-server.com
ROCKET_CHAT_USER_ID=your-user-id
ROCKET_CHAT_AUTH_TOKEN=your-personal-access-token
```

### 6. Package.json Scripts

```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "jest"
  }
}
```

## Python MCP Server Setup

### 1. Initialize Python Project

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install mcp rocketchat-API websocket-client python-dotenv
```

### 2. Python MCP Server Implementation

```python
# mcp_server.py
import asyncio
import json
import os
from typing import Any, Dict, List, Optional

from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource

from rocketchat_client import RocketChatClient

class RocketChatMCPServer:
    def __init__(self):
        self.server = Server("rocket-chat-mcp")
        self.client = RocketChatClient(
            base_url=os.getenv("ROCKET_CHAT_URL"),
            user_id=os.getenv("ROCKET_CHAT_USER_ID"),
            auth_token=os.getenv("ROCKET_CHAT_AUTH_TOKEN")
        )
        self.setup_handlers()

    def setup_handlers(self):
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            return [
                Tool(
                    name="send_message",
                    description="Send a message to a Rocket.Chat channel",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "channel": {"type": "string"},
                            "text": {"type": "string"},
                            "thread_id": {"type": "string"}
                        },
                        "required": ["channel", "text"]
                    }
                ),
                Tool(
                    name="list_channels",
                    description="List available channels",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ["public", "private", "direct"]}
                        }
                    }
                ),
                Tool(
                    name="get_messages",
                    description="Get messages from a channel",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "channel": {"type": "string"},
                            "count": {"type": "integer", "default": 20}
                        },
                        "required": ["channel"]
                    }
                ),
                Tool(
                    name="search_messages",
                    description="Search for messages",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "room_id": {"type": "string"}
                        },
                        "required": ["query"]
                    }
                ),
                Tool(
                    name="create_channel",
                    description="Create a new channel",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "members": {"type": "array", "items": {"type": "string"}},
                            "read_only": {"type": "boolean", "default": False}
                        },
                        "required": ["name"]
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(
            name: str, arguments: Optional[Dict[str, Any]]
        ) -> List[TextContent | ImageContent | EmbeddedResource]:
            try:
                if name == "send_message":
                    result = await self.client.send_message(
                        channel=arguments["channel"],
                        text=arguments["text"],
                        thread_id=arguments.get("thread_id")
                    )
                    return [TextContent(
                        type="text",
                        text=f"Message sent: {result['message']['_id']}"
                    )]

                elif name == "list_channels":
                    channels = await self.client.list_channels(
                        channel_type=arguments.get("type")
                    )
                    return [TextContent(
                        type="text",
                        text=json.dumps(channels, indent=2)
                    )]

                elif name == "get_messages":
                    messages = await self.client.get_messages(
                        channel=arguments["channel"],
                        count=arguments.get("count", 20)
                    )
                    return [TextContent(
                        type="text",
                        text=json.dumps(messages, indent=2)
                    )]

                elif name == "search_messages":
                    results = await self.client.search_messages(
                        query=arguments["query"],
                        room_id=arguments.get("room_id")
                    )
                    return [TextContent(
                        type="text",
                        text=json.dumps(results, indent=2)
                    )]

                elif name == "create_channel":
                    channel = await self.client.create_channel(
                        name=arguments["name"],
                        members=arguments.get("members", []),
                        read_only=arguments.get("read_only", False)
                    )
                    return [TextContent(
                        type="text",
                        text=f"Channel created: {channel['channel']['name']}"
                    )]

                else:
                    raise ValueError(f"Unknown tool: {name}")

            except Exception as e:
                return [TextContent(
                    type="text",
                    text=f"Error: {str(e)}"
                )]

    async def run(self):
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="rocket-chat-mcp",
                    server_version="1.0.0"
                )
            )

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    server = RocketChatMCPServer()
    asyncio.run(server.run())
```

### 3. Rocket.Chat Client for Python

```python
# rocketchat_client.py
import aiohttp
import asyncio
import json
import websockets
from typing import Dict, List, Optional, Any

class RocketChatClient:
    def __init__(self, base_url: str, user_id: str, auth_token: str):
        self.base_url = base_url
        self.user_id = user_id
        self.auth_token = auth_token
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def request(self, method: str, endpoint: str, **kwargs) -> Dict:
        if not self.session:
            self.session = aiohttp.ClientSession()

        headers = {
            'X-Auth-Token': self.auth_token,
            'X-User-Id': self.user_id,
            'Content-Type': 'application/json'
        }

        url = f"{self.base_url}/api/v1{endpoint}"
        
        async with self.session.request(
            method, url, headers=headers, **kwargs
        ) as response:
            if response.status >= 400:
                error = await response.json()
                raise Exception(f"API Error: {error.get('error', 'Unknown error')}")
            
            return await response.json()

    async def send_message(
        self, channel: str, text: str, thread_id: Optional[str] = None
    ) -> Dict:
        data = {
            "channel": channel,
            "text": text
        }
        if thread_id:
            data["tmid"] = thread_id

        return await self.request(
            "POST", "/chat.postMessage", json=data
        )

    async def list_channels(self, channel_type: Optional[str] = None) -> List[Dict]:
        endpoints = {
            "public": "/channels.list",
            "private": "/groups.list",
            "direct": "/im.list"
        }
        
        if channel_type and channel_type in endpoints:
            result = await self.request("GET", endpoints[channel_type])
            return result.get("channels", result.get("groups", result.get("ims", [])))
        
        result = await self.request("GET", "/rooms.get")
        return result.get("update", [])

    async def get_messages(self, channel: str, count: int = 20) -> List[Dict]:
        result = await self.request(
            "GET", f"/channels.messages?roomId={channel}&count={count}"
        )
        return result.get("messages", [])

    async def search_messages(
        self, query: str, room_id: Optional[str] = None
    ) -> List[Dict]:
        params = {"searchText": query}
        if room_id:
            params["roomId"] = room_id

        result = await self.request(
            "GET", f"/chat.search", params=params
        )
        return result.get("messages", [])

    async def create_channel(
        self, name: str, members: List[str] = None, read_only: bool = False
    ) -> Dict:
        data = {
            "name": name,
            "readOnly": read_only
        }
        if members:
            data["members"] = members

        return await self.request(
            "POST", "/channels.create", json=data
        )

    async def connect_websocket(self):
        """Connect to Rocket.Chat WebSocket for real-time events"""
        ws_url = self.base_url.replace("http", "ws") + "/websocket"
        
        async with websockets.connect(ws_url) as websocket:
            # Authenticate
            await websocket.send(json.dumps({
                "msg": "method",
                "method": "login",
                "id": "1",
                "params": [{
                    "resume": self.auth_token
                }]
            }))

            # Listen for messages
            async for message in websocket:
                data = json.loads(message)
                await self.handle_websocket_message(data)

    async def handle_websocket_message(self, message: Dict):
        """Handle incoming WebSocket messages"""
        print(f"WebSocket message: {message}")
        # Implement message handling logic here
```

## Docker Deployment

### Dockerfile for Node.js

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/index.js"]
```

### Dockerfile for Python

```dockerfile
# Dockerfile.python
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY *.py ./

# Run the server
CMD ["python", "mcp_server.py"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-node:
    build: .
    environment:
      - ROCKET_CHAT_URL=${ROCKET_CHAT_URL}
      - ROCKET_CHAT_USER_ID=${ROCKET_CHAT_USER_ID}
      - ROCKET_CHAT_AUTH_TOKEN=${ROCKET_CHAT_AUTH_TOKEN}
    restart: unless-stopped
    
  mcp-python:
    build:
      context: .
      dockerfile: Dockerfile.python
    environment:
      - ROCKET_CHAT_URL=${ROCKET_CHAT_URL}
      - ROCKET_CHAT_USER_ID=${ROCKET_CHAT_USER_ID}
      - ROCKET_CHAT_AUTH_TOKEN=${ROCKET_CHAT_AUTH_TOKEN}
    restart: unless-stopped
```

## Testing

### Test Configuration

```javascript
// test/setup.js
const dotenv = require('dotenv');
dotenv.config({ path: '.env.test' });

// Mock Rocket.Chat responses
const mockResponses = {
  '/api/v1/chat.postMessage': {
    success: true,
    message: {
      _id: 'test-message-id',
      rid: 'test-room-id',
      msg: 'Test message',
      ts: { $date: Date.now() }
    }
  },
  '/api/v1/channels.list': {
    channels: [
      { _id: 'channel1', name: 'general' },
      { _id: 'channel2', name: 'random' }
    ],
    success: true
  }
};

module.exports = { mockResponses };
```

### Integration Tests

```javascript
// test/integration.test.js
const { RocketChatClient } = require('../dist/rocket-chat-client');

describe('RocketChat MCP Integration', () => {
  let client;

  beforeAll(() => {
    client = new RocketChatClient({
      baseUrl: process.env.ROCKET_CHAT_URL,
      userId: process.env.ROCKET_CHAT_USER_ID,
      authToken: process.env.ROCKET_CHAT_AUTH_TOKEN
    });
  });

  test('should send message', async () => {
    const result = await client.sendMessage('#general', 'Test message');
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  test('should list channels', async () => {
    const channels = await client.listChannels('public');
    expect(Array.isArray(channels.channels)).toBe(true);
  });

  test('should search messages', async () => {
    const results = await client.searchMessages('test');
    expect(results).toBeDefined();
  });
});
```

## Monitoring and Logging

### Logging Setup

```javascript
// src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'rocket-chat-mcp' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## Deployment Checklist

- [ ] Set up environment variables
- [ ] Create service account in Rocket.Chat
- [ ] Generate Personal Access Token
- [ ] Test connection to Rocket.Chat server
- [ ] Configure SSL/TLS if using self-signed certificates
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting
- [ ] Test all MCP tools
- [ ] Set up error handling and retries
- [ ] Deploy with Docker or systemd service
- [ ] Configure automatic restarts
- [ ] Set up health checks
- [ ] Document API endpoints and usage
- [ ] Create backup and recovery procedures