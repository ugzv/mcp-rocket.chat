#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RocketChatClient } from './rocket-chat-client.js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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

const rocketChat = new RocketChatClient({
  baseUrl: process.env.ROCKET_CHAT_URL || 'https://myteam.chat',
  userId: process.env.ROCKET_CHAT_USER_ID || '',
  authToken: process.env.ROCKET_CHAT_AUTH_TOKEN || '',
});

// Define input schemas using Zod for better validation
const sendMessageSchema = z.object({
  channel: z.string().describe('Channel name (#channel) or username (@user)'),
  text: z.string().describe('Message text to send'),
  threadId: z.string().optional().describe('Optional thread ID to reply to'),
});

const listChannelsSchema = z.object({
  type: z.enum(['public', 'private', 'direct']).optional().describe('Type of channels to list'),
});

const getMessagesSchema = z.object({
  roomId: z.string().describe('Room ID to get messages from'),
  count: z.number().default(20).describe('Number of messages to retrieve'),
});

const searchMessagesSchema = z.object({
  query: z.string().describe('Search query'),
  roomId: z.string().optional().describe('Optional room ID to search in'),
});

const createChannelSchema = z.object({
  name: z.string().describe('Channel name'),
  members: z.array(z.string()).optional().describe('Initial members (usernames)'),
  readOnly: z.boolean().default(false).describe('Make channel read-only'),
});

const getUserInfoSchema = z.object({
  username: z.string().describe('Username to get info for'),
});

const getRoomInfoSchema = z.object({
  roomName: z.string().describe('Room name to get info for'),
});

const joinLeaveChannelSchema = z.object({
  roomId: z.string().describe('Room ID'),
});

const setTopicSchema = z.object({
  roomId: z.string().describe('Room ID'),
  topic: z.string().describe('New topic for the channel'),
});

// Define tools with better structure
const tools: Tool[] = [
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
        roomId: {
          type: 'string',
          description: 'Room ID to get messages from',
        },
        count: {
          type: 'number',
          description: 'Number of messages to retrieve',
          default: 20,
        },
      },
      required: ['roomId'],
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
          description: 'Initial members (usernames)',
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
  {
    name: 'get_user_info',
    description: 'Get information about a user',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to get info for',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'get_room_info',
    description: 'Get information about a room/channel',
    inputSchema: {
      type: 'object',
      properties: {
        roomName: {
          type: 'string',
          description: 'Room name to get info for',
        },
      },
      required: ['roomName'],
    },
  },
  {
    name: 'join_channel',
    description: 'Join a channel',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID to join',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'leave_channel',
    description: 'Leave a channel',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID to leave',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'set_topic',
    description: 'Set channel topic',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'Room ID',
        },
        topic: {
          type: 'string',
          description: 'New topic for the channel',
        },
      },
      required: ['roomId', 'topic'],
    },
  },
  {
    name: 'test_connection',
    description: 'Test the connection to Rocket.Chat server',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'send_message': {
        const validatedArgs = sendMessageSchema.parse(args);
        const result = await rocketChat.sendMessage(
          validatedArgs.channel,
          validatedArgs.text,
          validatedArgs.threadId
        );
        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully. Message ID: ${result.message._id}`,
            },
          ],
        };
      }

      case 'list_channels': {
        const validatedArgs = listChannelsSchema.parse(args);
        const channels = await rocketChat.listChannels(validatedArgs.type);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(channels, null, 2),
            },
          ],
        };
      }

      case 'get_messages': {
        const validatedArgs = getMessagesSchema.parse(args);
        const messages = await rocketChat.getMessages(
          validatedArgs.roomId,
          validatedArgs.count
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      }

      case 'search_messages': {
        const validatedArgs = searchMessagesSchema.parse(args);
        const searchResults = await rocketChat.searchMessages(
          validatedArgs.query,
          validatedArgs.roomId
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(searchResults, null, 2),
            },
          ],
        };
      }

      case 'create_channel': {
        const validatedArgs = createChannelSchema.parse(args);
        const channel = await rocketChat.createChannel(
          validatedArgs.name,
          validatedArgs.members,
          validatedArgs.readOnly
        );
        return {
          content: [
            {
              type: 'text',
              text: `Channel created successfully: ${channel.channel.name} (ID: ${channel.channel._id})`,
            },
          ],
        };
      }

      case 'get_user_info': {
        const validatedArgs = getUserInfoSchema.parse(args);
        const user = await rocketChat.getUserInfo(validatedArgs.username);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      }

      case 'get_room_info': {
        const validatedArgs = getRoomInfoSchema.parse(args);
        const room = await rocketChat.getRoomInfo(validatedArgs.roomName);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(room, null, 2),
            },
          ],
        };
      }

      case 'join_channel': {
        const validatedArgs = joinLeaveChannelSchema.parse(args);
        const result = await rocketChat.joinChannel(validatedArgs.roomId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Successfully joined channel' : 'Failed to join channel',
            },
          ],
        };
      }

      case 'leave_channel': {
        const validatedArgs = joinLeaveChannelSchema.parse(args);
        const result = await rocketChat.leaveChannel(validatedArgs.roomId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Successfully left channel' : 'Failed to leave channel',
            },
          ],
        };
      }

      case 'set_topic': {
        const validatedArgs = setTopicSchema.parse(args);
        const result = await rocketChat.setTopic(
          validatedArgs.roomId,
          validatedArgs.topic
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? `Topic set successfully: ${validatedArgs.topic}` : 'Failed to set topic',
            },
          ],
        };
      }
      
      case 'test_connection': {
        const result = await rocketChat.testConnection();
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `✅ Connection successful!\nUser: ${result.user.name}\nUsername: ${result.user.username}\nEmail: ${result.user.emails?.[0]?.address || 'N/A'}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Connection failed: ${result.error}`,
              },
            ],
          };
        }
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Tool execution error:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool: ${error.message || 'Unknown error occurred'}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rocket.Chat MCP server v1.0.0 running on stdio');
  console.error(`Connected to: ${process.env.ROCKET_CHAT_URL || 'https://myteam.chat'}`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});