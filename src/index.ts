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
  latest: z.string().optional().describe('Latest date to get messages from (ISO format)'),
  oldest: z.string().optional().describe('Oldest date to get messages from (ISO format)'),
});

const getRecentMessagesSchema = z.object({
  roomId: z.string().describe('Room ID to get messages from'),
  count: z.number().default(20).describe('Number of messages to retrieve'),
  daysBack: z.number().default(30).describe('Number of days back to search'),
});

const searchMessagesSchema = z.object({
  query: z.string().describe('Search query'),
  roomId: z.string().optional().describe('Optional room ID to search in'),
  count: z.number().default(20).describe('Number of messages to return'),
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

const updateMessageSchema = z.object({
  roomId: z.string().describe('Room ID'),
  msgId: z.string().describe('Message ID to update'),
  text: z.string().describe('New message text'),
});

const deleteMessageSchema = z.object({
  roomId: z.string().describe('Room ID'),
  msgId: z.string().describe('Message ID to delete'),
});

const reactToMessageSchema = z.object({
  messageId: z.string().describe('Message ID to react to'),
  emoji: z.string().describe('Emoji reaction (e.g., :+1:, :heart:)'),
  shouldReact: z.boolean().default(true).describe('Whether to add (true) or remove (false) reaction'),
});

const pinUnpinMessageSchema = z.object({
  messageId: z.string().describe('Message ID to pin/unpin'),
});

const getChannelMembersSchema = z.object({
  roomId: z.string().describe('Room ID'),
  offset: z.number().default(0).describe('Number of members to skip'),
  count: z.number().default(50).describe('Number of members to return'),
});

const inviteRemoveUserSchema = z.object({
  roomId: z.string().describe('Room ID'),
  userId: z.string().describe('User ID to invite/remove'),
});

const setAnnouncementSchema = z.object({
  roomId: z.string().describe('Room ID'),
  announcement: z.string().describe('Channel announcement text'),
});

const setDescriptionSchema = z.object({
  roomId: z.string().describe('Room ID'),
  description: z.string().describe('Channel description text'),
});

const getRoomMessagesSchema = z.object({
  roomId: z.string().describe('Room ID'),
  count: z.number().default(20).describe('Number of messages to return'),
});

const getThreadMessagesSchema = z.object({
  tmid: z.string().describe('Thread message ID'),
  count: z.number().default(50).describe('Number of messages to return'),
});

const getThreadsListSchema = z.object({
  roomId: z.string().describe('Room ID'),
  type: z.enum(['all', 'unread', 'following']).default('all').describe('Type of threads to list'),
  count: z.number().default(50).describe('Number of threads to return'),
});

const followUnfollowMessageSchema = z.object({
  messageId: z.string().describe('Message ID to follow/unfollow'),
});

const getRoomFilesSchema = z.object({
  roomId: z.string().describe('Room ID'),
  offset: z.number().default(0).describe('Number of files to skip'),
  count: z.number().default(50).describe('Number of files to return'),
});

const setUserStatusSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'offline']).describe('User status'),
  message: z.string().optional().describe('Status message'),
});

const getUserPresenceSchema = z.object({
  userId: z.string().describe('User ID to get presence for'),
});

const uploadFileSchema = z.object({
  roomId: z.string().describe('Room ID to upload file to'),
  filePath: z.string().describe('Local file path to upload'),
  description: z.string().optional().describe('Optional description for the file'),
  threadId: z.string().optional().describe('Optional thread ID to upload to'),
  allowedTypes: z.array(z.string()).optional().describe('Optional array of allowed MIME types'),
  maxSize: z.number().optional().describe('Optional maximum file size in bytes'),
});

const downloadFileSchema = z.object({
  fileId: z.string().describe('File ID to download'),
  fileName: z.string().describe('File name'),
  savePath: z.string().optional().describe('Optional local path to save file (if not provided, returns base64)'),
});

const uploadImageSchema = z.object({
  roomId: z.string().describe('Room ID to upload image to'),
  imagePath: z.string().describe('Local image path to upload'),
  description: z.string().optional().describe('Optional description for the image'),
  threadId: z.string().optional().describe('Optional thread ID to upload to'),
  analyzeImage: z.boolean().default(true).describe('Whether to analyze the image using MCP capabilities'),
});

const analyzeImageSchema = z.object({
  fileId: z.string().describe('File ID of the image to analyze'),
  fileName: z.string().describe('File name of the image'),
  analysisType: z.enum(['describe', 'extract_text', 'extract_text_only', 'identify_objects', 'custom']).default('describe').describe('Type of analysis to perform'),
  customPrompt: z.string().optional().describe('Custom prompt for analysis (required if analysisType is custom)'),
});

const deleteFileSchema = z.object({
  fileId: z.string().describe('File ID to delete'),
});

const sendMessageWithAttachmentSchema = z.object({
  channel: z.string().describe('Channel name (#channel) or username (@user)'),
  text: z.string().describe('Message text to send with attachment'),
  filePath: z.string().describe('Local file path to attach'),
  threadId: z.string().optional().describe('Optional thread ID to reply to'),
});

const advancedSearchSchema = z.object({
  query: z.string().describe('Search query text'),
  roomId: z.string().optional().describe('Optional room ID to search within'),
  userId: z.string().optional().describe('Optional user ID to filter messages by'),
  dateFrom: z.string().optional().describe('Start date for search (ISO format)'),
  dateTo: z.string().optional().describe('End date for search (ISO format)'),
  messageType: z.enum(['all', 'mentions', 'starred', 'pinned']).default('all').describe('Type of messages to search'),
  sortBy: z.enum(['timestamp', 'relevance']).default('timestamp').describe('Sort results by'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  count: z.number().default(20).describe('Number of results to return'),
  offset: z.number().default(0).describe('Number of results to skip'),
});

const globalSearchSchema = z.object({
  query: z.string().describe('Global search query'),
  searchType: z.enum(['messages', 'rooms', 'users', 'all']).default('all').describe('Type of content to search'),
  limit: z.number().default(50).describe('Maximum number of results per type'),
});

const getRoomAnalyticsSchema = z.object({
  roomId: z.string().describe('Room ID to analyze'),
  dateFrom: z.string().optional().describe('Start date for analysis (ISO format)'),
  dateTo: z.string().optional().describe('End date for analysis (ISO format)'),
  includeMessages: z.boolean().default(true).describe('Include message analytics'),
  includeFiles: z.boolean().default(true).describe('Include file analytics'),
  includeMembers: z.boolean().default(true).describe('Include member analytics'),
});

const getUserActivitySchema = z.object({
  userId: z.string().describe('User ID to analyze'),
  dateFrom: z.string().optional().describe('Start date for analysis (ISO format)'),
  dateTo: z.string().optional().describe('End date for analysis (ISO format)'),
  includeRooms: z.array(z.string()).optional().describe('Specific room IDs to analyze'),
});

const getServerStatisticsSchema = z.object({
  // No parameters needed for server statistics
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
    description: 'Get messages from a channel with optional date filtering',
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
        latest: {
          type: 'string',
          description: 'Latest date to get messages from (ISO format)',
        },
        oldest: {
          type: 'string', 
          description: 'Oldest date to get messages from (ISO format)',
        },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_recent_messages',
    description: 'Get recent messages from a channel (last 30 days by default)',
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
        daysBack: {
          type: 'number',
          description: 'Number of days back to search',
          default: 30,
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
  {
    name: 'update_message',
    description: 'Update/edit an existing message',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        msgId: { type: 'string', description: 'Message ID to update' },
        text: { type: 'string', description: 'New message text' },
      },
      required: ['roomId', 'msgId', 'text'],
    },
  },
  {
    name: 'delete_message',
    description: 'Delete a message',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        msgId: { type: 'string', description: 'Message ID to delete' },
      },
      required: ['roomId', 'msgId'],
    },
  },
  {
    name: 'react_to_message',
    description: 'Add or remove emoji reaction to a message',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Message ID to react to' },
        emoji: { type: 'string', description: 'Emoji reaction (e.g., :+1:, :heart:)' },
        shouldReact: { type: 'boolean', description: 'Whether to add (true) or remove (false) reaction', default: true },
      },
      required: ['messageId', 'emoji'],
    },
  },
  {
    name: 'pin_message',
    description: 'Pin a message in a channel',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Message ID to pin' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'unpin_message',
    description: 'Unpin a message in a channel',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Message ID to unpin' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'get_channel_members',
    description: 'Get members of a channel/room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        offset: { type: 'number', description: 'Number of members to skip', default: 0 },
        count: { type: 'number', description: 'Number of members to return', default: 50 },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'invite_to_channel',
    description: 'Invite a user to a channel',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        userId: { type: 'string', description: 'User ID to invite' },
      },
      required: ['roomId', 'userId'],
    },
  },
  {
    name: 'remove_from_channel',
    description: 'Remove a user from a channel',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        userId: { type: 'string', description: 'User ID to remove' },
      },
      required: ['roomId', 'userId'],
    },
  },
  {
    name: 'set_channel_announcement',
    description: 'Set channel announcement',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        announcement: { type: 'string', description: 'Channel announcement text' },
      },
      required: ['roomId', 'announcement'],
    },
  },
  {
    name: 'set_channel_description',
    description: 'Set channel description',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        description: { type: 'string', description: 'Channel description text' },
      },
      required: ['roomId', 'description'],
    },
  },
  {
    name: 'get_starred_messages',
    description: 'Get starred messages from a room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        count: { type: 'number', description: 'Number of messages to return', default: 20 },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_pinned_messages',
    description: 'Get pinned messages from a room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        count: { type: 'number', description: 'Number of messages to return', default: 20 },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_mentioned_messages',
    description: 'Get messages where user was mentioned',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        count: { type: 'number', description: 'Number of messages to return', default: 20 },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_thread_messages',
    description: 'Get messages from a specific thread',
    inputSchema: {
      type: 'object',
      properties: {
        tmid: { type: 'string', description: 'Thread message ID' },
        count: { type: 'number', description: 'Number of messages to return', default: 50 },
      },
      required: ['tmid'],
    },
  },
  {
    name: 'get_threads_list',
    description: 'Get list of threads in a room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        type: { type: 'string', enum: ['all', 'unread', 'following'], description: 'Type of threads to list', default: 'all' },
        count: { type: 'number', description: 'Number of threads to return', default: 50 },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'follow_message',
    description: 'Follow a message/thread for notifications',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Message ID to follow' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'unfollow_message',
    description: 'Unfollow a message/thread',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Message ID to unfollow' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'get_room_files',
    description: 'Get files uploaded to a room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
        offset: { type: 'number', description: 'Number of files to skip', default: 0 },
        count: { type: 'number', description: 'Number of files to return', default: 50 },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_room_counters',
    description: 'Get room statistics (members, messages, unreads)',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_server_info',
    description: 'Get Rocket.Chat server information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_user_status',
    description: 'Set user status and message',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['online', 'away', 'busy', 'offline'], description: 'User status' },
        message: { type: 'string', description: 'Status message' },
      },
      required: ['status'],
    },
  },
  {
    name: 'get_user_presence',
    description: 'Get user presence information',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to get presence for' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'upload_file',
    description: 'Upload a file to a Rocket.Chat room',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID to upload file to' },
        filePath: { type: 'string', description: 'Local file path to upload' },
        description: { type: 'string', description: 'Optional description for the file' },
        threadId: { type: 'string', description: 'Optional thread ID to upload to' },
        allowedTypes: { type: 'array', items: { type: 'string' }, description: 'Optional array of allowed MIME types' },
        maxSize: { type: 'number', description: 'Optional maximum file size in bytes' },
      },
      required: ['roomId', 'filePath'],
    },
  },
  {
    name: 'download_file',
    description: 'Download a file from Rocket.Chat',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'File ID to download' },
        fileName: { type: 'string', description: 'File name' },
        savePath: { type: 'string', description: 'Optional local path to save file (if not provided, returns base64)' },
      },
      required: ['fileId', 'fileName'],
    },
  },
  {
    name: 'upload_image',
    description: 'Upload an image to a Rocket.Chat room with optional AI analysis',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID to upload image to' },
        imagePath: { type: 'string', description: 'Local image path to upload' },
        description: { type: 'string', description: 'Optional description for the image' },
        threadId: { type: 'string', description: 'Optional thread ID to upload to' },
        analyzeImage: { type: 'boolean', description: 'Whether to analyze the image using MCP capabilities', default: true },
      },
      required: ['roomId', 'imagePath'],
    },
  },
  {
    name: 'analyze_image',
    description: 'Analyze an image that exists in a Rocket.Chat room using MCP image understanding',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'File ID of the image to analyze' },
        fileName: { type: 'string', description: 'File name of the image' },
        analysisType: { 
          type: 'string', 
          enum: ['describe', 'extract_text', 'extract_text_only', 'identify_objects', 'custom'],
          description: 'Type of analysis to perform',
          default: 'describe'
        },
        customPrompt: { type: 'string', description: 'Custom prompt for analysis (required if analysisType is custom)' },
      },
      required: ['fileId', 'fileName'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from Rocket.Chat',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'File ID to delete' },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'send_message_with_attachment',
    description: 'Send a message with a file attachment to a Rocket.Chat channel',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name (#channel) or username (@user)' },
        text: { type: 'string', description: 'Message text to send with attachment' },
        filePath: { type: 'string', description: 'Local file path to attach' },
        threadId: { type: 'string', description: 'Optional thread ID to reply to' },
      },
      required: ['channel', 'text', 'filePath'],
    },
  },
  {
    name: 'advanced_search',
    description: 'Advanced search with filters, date ranges, and sorting options',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        roomId: { type: 'string', description: 'Optional room ID to search within' },
        userId: { type: 'string', description: 'Optional user ID to filter messages by' },
        dateFrom: { type: 'string', description: 'Start date for search (ISO format)' },
        dateTo: { type: 'string', description: 'End date for search (ISO format)' },
        messageType: { 
          type: 'string', 
          enum: ['all', 'mentions', 'starred', 'pinned'],
          description: 'Type of messages to search',
          default: 'all'
        },
        sortBy: { 
          type: 'string', 
          enum: ['timestamp', 'relevance'],
          description: 'Sort results by',
          default: 'timestamp'
        },
        sortOrder: { 
          type: 'string', 
          enum: ['asc', 'desc'],
          description: 'Sort order',
          default: 'desc'
        },
        count: { type: 'number', description: 'Number of results to return', default: 20 },
        offset: { type: 'number', description: 'Number of results to skip', default: 0 },
      },
      required: ['query'],
    },
  },
  {
    name: 'global_search',
    description: 'Search across all accessible content (messages, rooms, users)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Global search query' },
        searchType: { 
          type: 'string', 
          enum: ['messages', 'rooms', 'users', 'all'],
          description: 'Type of content to search',
          default: 'all'
        },
        limit: { type: 'number', description: 'Maximum number of results per type', default: 50 },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_server_statistics',
    description: 'Get comprehensive server statistics and usage metrics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_room_analytics',
    description: 'Get detailed analytics for a specific room including message patterns, file usage, and member activity',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'Room ID to analyze' },
        dateFrom: { type: 'string', description: 'Start date for analysis (ISO format)' },
        dateTo: { type: 'string', description: 'End date for analysis (ISO format)' },
        includeMessages: { type: 'boolean', description: 'Include message analytics', default: true },
        includeFiles: { type: 'boolean', description: 'Include file analytics', default: true },
        includeMembers: { type: 'boolean', description: 'Include member analytics', default: true },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'get_user_activity',
    description: 'Get detailed user activity summary across rooms with behavioral insights',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to analyze' },
        dateFrom: { type: 'string', description: 'Start date for analysis (ISO format)' },
        dateTo: { type: 'string', description: 'End date for analysis (ISO format)' },
        includeRooms: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Specific room IDs to analyze' 
        },
      },
      required: ['userId'],
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
          validatedArgs.count,
          validatedArgs.latest,
          validatedArgs.oldest
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

      case 'get_recent_messages': {
        const validatedArgs = getRecentMessagesSchema.parse(args);
        const messages = await rocketChat.getRecentMessages(
          validatedArgs.roomId,
          validatedArgs.count,
          validatedArgs.daysBack
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
          validatedArgs.roomId,
          validatedArgs.count
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

      case 'update_message': {
        const validatedArgs = updateMessageSchema.parse(args);
        const result = await rocketChat.updateMessage(
          validatedArgs.roomId,
          validatedArgs.msgId,
          validatedArgs.text
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Message updated successfully' : 'Failed to update message',
            },
          ],
        };
      }

      case 'delete_message': {
        const validatedArgs = deleteMessageSchema.parse(args);
        const result = await rocketChat.deleteMessage(
          validatedArgs.roomId,
          validatedArgs.msgId
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Message deleted successfully' : 'Failed to delete message',
            },
          ],
        };
      }

      case 'react_to_message': {
        const validatedArgs = reactToMessageSchema.parse(args);
        const result = await rocketChat.reactToMessage(
          validatedArgs.messageId,
          validatedArgs.emoji,
          validatedArgs.shouldReact
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? `Reaction ${validatedArgs.shouldReact ? 'added' : 'removed'} successfully` : 'Failed to react to message',
            },
          ],
        };
      }

      case 'pin_message': {
        const validatedArgs = pinUnpinMessageSchema.parse(args);
        const result = await rocketChat.pinMessage(validatedArgs.messageId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Message pinned successfully' : 'Failed to pin message',
            },
          ],
        };
      }

      case 'unpin_message': {
        const validatedArgs = pinUnpinMessageSchema.parse(args);
        const result = await rocketChat.unpinMessage(validatedArgs.messageId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Message unpinned successfully' : 'Failed to unpin message',
            },
          ],
        };
      }

      case 'get_channel_members': {
        const validatedArgs = getChannelMembersSchema.parse(args);
        const members = await rocketChat.getChannelMembers(
          validatedArgs.roomId,
          validatedArgs.offset,
          validatedArgs.count
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(members, null, 2),
            },
          ],
        };
      }

      case 'invite_to_channel': {
        const validatedArgs = inviteRemoveUserSchema.parse(args);
        const result = await rocketChat.inviteToChannel(
          validatedArgs.roomId,
          validatedArgs.userId
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'User invited successfully' : 'Failed to invite user',
            },
          ],
        };
      }

      case 'remove_from_channel': {
        const validatedArgs = inviteRemoveUserSchema.parse(args);
        const result = await rocketChat.removeFromChannel(
          validatedArgs.roomId,
          validatedArgs.userId
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'User removed successfully' : 'Failed to remove user',
            },
          ],
        };
      }

      case 'set_channel_announcement': {
        const validatedArgs = setAnnouncementSchema.parse(args);
        const result = await rocketChat.setChannelAnnouncement(
          validatedArgs.roomId,
          validatedArgs.announcement
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Announcement set successfully' : 'Failed to set announcement',
            },
          ],
        };
      }

      case 'set_channel_description': {
        const validatedArgs = setDescriptionSchema.parse(args);
        const result = await rocketChat.setChannelDescription(
          validatedArgs.roomId,
          validatedArgs.description
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Description set successfully' : 'Failed to set description',
            },
          ],
        };
      }

      case 'get_starred_messages': {
        const validatedArgs = getRoomMessagesSchema.parse(args);
        const messages = await rocketChat.getStarredMessages(
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

      case 'get_pinned_messages': {
        const validatedArgs = getRoomMessagesSchema.parse(args);
        const messages = await rocketChat.getPinnedMessages(
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

      case 'get_mentioned_messages': {
        const validatedArgs = getRoomMessagesSchema.parse(args);
        const messages = await rocketChat.getMentionedMessages(
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

      case 'get_thread_messages': {
        const validatedArgs = getThreadMessagesSchema.parse(args);
        const messages = await rocketChat.getThreadMessages(
          validatedArgs.tmid,
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

      case 'get_threads_list': {
        const validatedArgs = getThreadsListSchema.parse(args);
        const threads = await rocketChat.getThreadsList(
          validatedArgs.roomId,
          validatedArgs.type,
          validatedArgs.count
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(threads, null, 2),
            },
          ],
        };
      }

      case 'follow_message': {
        const validatedArgs = followUnfollowMessageSchema.parse(args);
        const result = await rocketChat.followMessage(validatedArgs.messageId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Message followed successfully' : 'Failed to follow message',
            },
          ],
        };
      }

      case 'unfollow_message': {
        const validatedArgs = followUnfollowMessageSchema.parse(args);
        const result = await rocketChat.unfollowMessage(validatedArgs.messageId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'Message unfollowed successfully' : 'Failed to unfollow message',
            },
          ],
        };
      }

      case 'get_room_files': {
        const validatedArgs = getRoomFilesSchema.parse(args);
        const files = await rocketChat.getRoomFiles(
          validatedArgs.roomId,
          validatedArgs.offset,
          validatedArgs.count
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      case 'get_room_counters': {
        const validatedArgs = { roomId: (args as any).roomId };
        const counters = await rocketChat.getRoomCounters(validatedArgs.roomId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(counters, null, 2),
            },
          ],
        };
      }

      case 'get_server_info': {
        const serverInfo = await rocketChat.getServerInfo();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(serverInfo, null, 2),
            },
          ],
        };
      }

      case 'set_user_status': {
        const validatedArgs = setUserStatusSchema.parse(args);
        const result = await rocketChat.setUserStatus(
          validatedArgs.status,
          validatedArgs.message
        );
        return {
          content: [
            {
              type: 'text',
              text: result.success ? `Status set to ${validatedArgs.status}` : 'Failed to set status',
            },
          ],
        };
      }

      case 'get_user_presence': {
        const validatedArgs = getUserPresenceSchema.parse(args);
        const presence = await rocketChat.getUserPresence(validatedArgs.userId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(presence, null, 2),
            },
          ],
        };
      }

      case 'upload_file': {
        const validatedArgs = uploadFileSchema.parse(args);
        
        // Validate file if restrictions are provided
        if (validatedArgs.allowedTypes || validatedArgs.maxSize) {
          await rocketChat.validateFileType(
            validatedArgs.filePath, 
            validatedArgs.allowedTypes, 
            validatedArgs.maxSize
          );
        }
        
        const result = await rocketChat.uploadFile(
          validatedArgs.roomId,
          validatedArgs.filePath,
          validatedArgs.description,
          validatedArgs.threadId
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `File uploaded successfully!\nMessage ID: ${result.message._id}\nFile ID: ${result.message.file._id}\nFile Name: ${result.message.file.name}\nFile Size: ${result.message.file.size} bytes`,
            },
          ],
        };
      }

      case 'download_file': {
        const validatedArgs = downloadFileSchema.parse(args);
        const result = await rocketChat.downloadFile(
          validatedArgs.fileId,
          validatedArgs.fileName,
          validatedArgs.savePath
        );
        
        if (validatedArgs.savePath) {
          return {
            content: [
              {
                type: 'text',
                text: `File downloaded successfully to: ${result.path}\nSize: ${result.size} bytes`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `File downloaded as base64 data (${result.size} bytes)\nMIME Type: ${result.mimeType}\nBase64 Data: ${result.data?.substring(0, 100) || 'No data'}...`,
              },
            ],
          };
        }
      }

      case 'upload_image': {
        const validatedArgs = uploadImageSchema.parse(args);
        
        // Validate it's an image file
        const imageTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
          'image/svg+xml', 'image/bmp', 'image/tiff'
        ];
        
        await rocketChat.validateFileType(validatedArgs.imagePath, imageTypes);
        
        let analysisText = validatedArgs.description || '';
        
        // Analyze image if requested
        if (validatedArgs.analyzeImage) {
          // TODO: Add image analysis using MCP capabilities
          // For now, we'll add a placeholder that can be enhanced
          analysisText += (analysisText ? '\n\n' : '') + '[Image analysis would be performed here using MCP capabilities]';
        }
        
        const result = await rocketChat.uploadFile(
          validatedArgs.roomId,
          validatedArgs.imagePath,
          analysisText,
          validatedArgs.threadId
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Image uploaded successfully!\nMessage ID: ${result.message._id}\nFile ID: ${result.message.file._id}\nImage Name: ${result.message.file.name}\nImage Size: ${result.message.file.size} bytes\nImage URL: ${result.message.file.url}`,
            },
          ],
        };
      }

      case 'analyze_image': {
        const validatedArgs = analyzeImageSchema.parse(args);
        
        // Download the image for analysis
        const imageData = await rocketChat.downloadFile(validatedArgs.fileId, validatedArgs.fileName);
        
        if (!imageData.success) {
          throw new Error('Failed to download image for analysis');
        }
        
        // Generate analysis prompt based on type
        let prompt = '';
        switch (validatedArgs.analysisType) {
          case 'describe':
            prompt = 'Please provide a concise description of what you see in this image (limit to 3-4 sentences).';
            break;
          case 'extract_text':
            prompt = 'Please extract any text you can see in this image. Return only the text content, no additional commentary.';
            break;
          case 'extract_text_only':
            prompt = 'Extract ONLY the text visible in this image. Return just the text with no descriptions, explanations, or formatting - raw text only.';
            break;
          case 'identify_objects':
            prompt = 'Please list the main objects/items you can identify in this image as a bullet point list.';
            break;
          case 'custom':
            if (!validatedArgs.customPrompt) {
              throw new Error('Custom prompt is required when analysisType is "custom"');
            }
            prompt = validatedArgs.customPrompt + ' (Please keep your response concise and under 500 words)';
            break;
        }
        
        // Return the image data for MCP to analyze with length-optimized prompts
        return {
          content: [
            {
              type: 'text',
              text: `Analysis Request: ${validatedArgs.analysisType}\nFile: ${validatedArgs.fileName}\n\n${prompt}`,
            },
            {
              type: 'image',
              data: imageData.data || '',
              mimeType: imageData.mimeType || 'image/jpeg',
            },
          ],
        };
      }

      case 'delete_file': {
        const validatedArgs = deleteFileSchema.parse(args);
        const result = await rocketChat.deleteFile(validatedArgs.fileId);
        return {
          content: [
            {
              type: 'text',
              text: result.success ? 'File deleted successfully' : 'Failed to delete file',
            },
          ],
        };
      }

      case 'send_message_with_attachment': {
        const validatedArgs = sendMessageWithAttachmentSchema.parse(args);
        const result = await rocketChat.sendMessageWithAttachment(
          validatedArgs.channel,
          validatedArgs.text,
          validatedArgs.filePath,
          validatedArgs.threadId
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Message with attachment sent successfully!\nMessage ID: ${result.message._id}\nFile ID: ${result.file._id}\nFile Name: ${result.file.name}`,
            },
          ],
        };
      }

      case 'advanced_search': {
        const validatedArgs = advancedSearchSchema.parse(args);
        const result = await rocketChat.advancedSearch({
          query: validatedArgs.query,
          roomId: validatedArgs.roomId,
          userId: validatedArgs.userId,
          dateFrom: validatedArgs.dateFrom,
          dateTo: validatedArgs.dateTo,
          messageType: validatedArgs.messageType,
          sortBy: validatedArgs.sortBy,
          sortOrder: validatedArgs.sortOrder,
          count: validatedArgs.count,
          offset: validatedArgs.offset
        });

        return {
          content: [
            {
              type: 'text',
              text: `Advanced Search Results:\nQuery: "${validatedArgs.query}"\nFound: ${result.total} messages\nFilters Applied: ${JSON.stringify(result.filters, null, 2)}\n\nResults:\n${JSON.stringify(result.messages, null, 2)}`,
            },
          ],
        };
      }

      case 'global_search': {
        const validatedArgs = globalSearchSchema.parse(args);
        const result = await rocketChat.globalSearch({
          query: validatedArgs.query,
          searchType: validatedArgs.searchType,
          limit: validatedArgs.limit
        });

        const summary = `Global Search Results for: "${validatedArgs.query}"\n` +
                       `Search Type: ${validatedArgs.searchType}\n\n` +
                       `Results Found:\n` +
                       `- Messages: ${result.totals.messages}\n` +
                       `- Rooms: ${result.totals.rooms}\n` +
                       `- Users: ${result.totals.users}\n\n`;

        return {
          content: [
            {
              type: 'text',
              text: summary + JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_server_statistics': {
        const result = await rocketChat.getServerStatistics();
        
        return {
          content: [
            {
              type: 'text',
              text: `Server Statistics:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'get_room_analytics': {
        const validatedArgs = getRoomAnalyticsSchema.parse(args);
        const result = await rocketChat.getRoomAnalytics(validatedArgs.roomId, {
          dateFrom: validatedArgs.dateFrom,
          dateTo: validatedArgs.dateTo,
          includeMessages: validatedArgs.includeMessages,
          includeFiles: validatedArgs.includeFiles,
          includeMembers: validatedArgs.includeMembers
        });

        const summary = `Room Analytics for: ${validatedArgs.roomId}\n` +
                       `Period: ${validatedArgs.dateFrom || 'All time'} to ${validatedArgs.dateTo || 'Now'}\n\n`;

        return {
          content: [
            {
              type: 'text',
              text: summary + JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_user_activity': {
        const validatedArgs = getUserActivitySchema.parse(args);
        const result = await rocketChat.getUserActivitySummary(validatedArgs.userId, {
          dateFrom: validatedArgs.dateFrom,
          dateTo: validatedArgs.dateTo,
          includeRooms: validatedArgs.includeRooms
        });

        const summary = `User Activity Summary for: ${validatedArgs.userId}\n` +
                       `Period: ${validatedArgs.dateFrom || 'All time'} to ${validatedArgs.dateTo || 'Now'}\n\n`;

        return {
          content: [
            {
              type: 'text',
              text: summary + JSON.stringify(result, null, 2),
            },
          ],
        };
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