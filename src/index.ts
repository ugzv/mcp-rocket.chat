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