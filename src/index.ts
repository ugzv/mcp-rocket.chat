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

// Response formatting helpers to reduce context window usage
class ResponseFormatter {
  static formatMessage(msg: any): string {
    const timestamp = new Date(msg.ts).toLocaleString();
    const user = msg.u ? `${msg.u.name || msg.u.username}` : 'Unknown';
    const text = msg.msg || '[No text content]';
    
    // Handle file attachments
    if (msg.file) {
      return `[${timestamp}] ${user}: 📎 ${msg.file.name || 'File'} (${msg.file.type || 'unknown type'})${text ? ` - ${text}` : ''}`;
    }
    
    return `[${timestamp}] ${user}: ${text}`;
  }

  static formatMessages(messages: any[], maxCount: number = 10): string {
    if (!messages || messages.length === 0) {
      return 'No messages found.';
    }

    const displayMessages = messages.slice(0, maxCount);
    const truncated = messages.length > maxCount;
    
    const formatted = displayMessages.map(msg => this.formatMessage(msg)).join('\n');
    
    if (truncated) {
      return `${formatted}\n\n... and ${messages.length - maxCount} more messages (showing first ${maxCount})`;
    }
    
    return formatted;
  }

  static formatSearchResults(result: any): string {
    const { query, total, messages, filters } = result;
    
    let output = `Search Results for: "${query}"\n`;
    output += `Found: ${total} messages\n`;
    
    if (filters && Object.keys(filters).some(k => filters[k])) {
      const activeFilters = Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      output += `Filters: ${activeFilters}\n`;
    }
    
    output += '\n' + this.formatMessages(messages || [], 5);
    
    return output;
  }

  static formatRoom(room: any): string {
    const name = room.name || room.fname || 'Unnamed Room';
    const type = room.t === 'c' ? 'Channel' : room.t === 'p' ? 'Private Group' : room.t === 'd' ? 'Direct Message' : 'Room';
    const members = room.usersCount || room.msgs || 'Unknown';
    
    return `${type}: ${name} (${members} ${typeof members === 'number' && members === 1 ? 'member' : 'members'})`;
  }

  static formatChannelList(channels: any[], maxCount: number = 20): string {
    if (!channels || channels.length === 0) {
      return 'No channels found.';
    }

    const displayChannels = channels.slice(0, maxCount);
    const truncated = channels.length > maxCount;
    
    const formatted = displayChannels.map(channel => {
      const name = channel.fname || channel.name || 'Unnamed Channel';
      const type = channel.t === 'c' ? '🏢' : channel.t === 'p' ? '🔒' : channel.t === 'd' ? '👤' : '📁';
      const members = channel.usersCount || 0;
      const messages = channel.msgs || 0;
      const topic = channel.topic ? ` - ${channel.topic.substring(0, 50)}${channel.topic.length > 50 ? '...' : ''}` : '';
      const lastActivity = channel.lastMessage?.ts ? 
        ` (last: ${new Date(channel.lastMessage.ts).toLocaleDateString()})` : '';
      
      return `${type} ${name} | ${members} members, ${messages} msgs${topic}${lastActivity}`;
    }).join('\n');
    
    if (truncated) {
      return `${formatted}\n\n... and ${channels.length - maxCount} more channels (showing first ${maxCount})`;
    }
    
    return formatted;
  }

  static formatUserInfo(user: any): string {
    if (!user) return 'User not found.';
    
    const name = user.name || 'No display name';
    const username = user.username || 'No username';
    const status = user.status || 'Unknown';
    const email = user.emails?.[0]?.address || 'No email';
    const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
    const roles = user.roles?.join(', ') || 'user';
    
    return `👤 ${name} (@${username})\n` +
           `Status: ${status}\n` +
           `Email: ${email}\n` +
           `Roles: ${roles}\n` +
           `Created: ${created}\n` +
           `Last Login: ${lastLogin}`;
  }

  static formatRoomInfo(room: any): string {
    if (!room) return 'Room not found.';
    
    const name = room.fname || room.name || 'Unnamed Room';
    const type = room.t === 'c' ? 'Public Channel' : 
                 room.t === 'p' ? 'Private Group' : 
                 room.t === 'd' ? 'Direct Message' : 'Room';
    const members = room.usersCount || 0;
    const messages = room.msgs || 0;
    const topic = room.topic || 'No topic';
    const description = room.description || 'No description';
    const created = room.ts ? new Date(room.ts).toLocaleDateString() : 'Unknown';
    const creator = room.u?.username || 'Unknown';
    const readonly = room.ro ? 'Yes' : 'No';
    
    return `🏠 ${name}\n` +
           `Type: ${type}\n` +
           `Members: ${members} | Messages: ${messages}\n` +
           `Topic: ${topic}\n` +
           `Description: ${description}\n` +
           `Created: ${created} by @${creator}\n` +
           `Read-only: ${readonly}`;
  }

  static formatUser(user: any): string {
    const name = user.name || user.username || 'Unknown User';
    const username = user.username ? `@${user.username}` : '';
    const status = user.status ? `(${user.status})` : '';
    
    return `${name} ${username} ${status}`.trim();
  }


  static formatAnalytics(analytics: any): string {
    if (!analytics.success) {
      return `Analytics Error: ${analytics.error}`;
    }

    let output = `📊 Analytics Summary\n`;
    
    if (analytics.metrics?.counters) {
      const counters = analytics.metrics.counters;
      output += `Room Stats: ${counters.joined || 0} members, ${counters.msgs || 0} messages, ${counters.unreads || 0} unread\n`;
    }
    
    if (analytics.metrics?.messages) {
      const msgs = analytics.metrics.messages;
      output += `Messages: ${msgs.total} total, avg length: ${msgs.averageLength} chars\n`;
      
      if (msgs.mostActive) {
        output += `Most active: ${msgs.mostActive.name || msgs.mostActive.username} (${msgs.mostActive.count} messages)\n`;
      }
    }
    
    if (analytics.metrics?.files) {
      const files = analytics.metrics.files;
      output += `Files: ${files.total} total, ${Math.round(files.totalSize / 1024 / 1024)}MB storage\n`;
      
      const topTypes = Object.entries(files.byType)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 3)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');
      
      if (topTypes) {
        output += `Top file types: ${topTypes}\n`;
      }
    }
    
    if (analytics.metrics?.members) {
      const members = analytics.metrics.members;
      output += `Members: ${members.total} total, ${members.joinedRecently} joined recently\n`;
      
      const statusCounts = Object.entries(members.byStatus)
        .filter(([,count]: any) => count > 0)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ');
      
      if (statusCounts) {
        output += `Status: ${statusCounts}\n`;
      }
    }
    
    return output;
  }

  static formatUserActivity(activity: any): string {
    if (!activity.success) {
      return `User Activity Error: ${activity.error}`;
    }

    let output = `👤 User Activity: ${activity.user?.name || activity.userId}\n`;
    
    const metrics = activity.metrics;
    if (metrics) {
      output += `Total Messages: ${metrics.totalMessages}\n`;
      output += `Active Rooms: ${metrics.activeRooms?.length || 0}\n`;
      
      if (metrics.mostActiveRoom) {
        output += `Most Active Room: ${metrics.mostActiveRoom.roomName} (${metrics.mostActiveRoom.messageCount} messages)\n`;
      }
      
      if (metrics.messageTypes) {
        const types = metrics.messageTypes;
        output += `Message Types: ${types.text} text, ${types.files} files\n`;
      }
      
      // Show peak activity hours
      if (metrics.timeDistribution) {
        const hourEntries = Object.entries(metrics.timeDistribution) as [string, number][];
        if (hourEntries.length > 0) {
          const peakHour = hourEntries.reduce((prev, current) => prev[1] > current[1] ? prev : current);
          output += `Peak Activity: ${peakHour[1]} messages at ${peakHour[0]}:00\n`;
        }
      }
    }
    
    return output;
  }

  static formatFileList(files: any[], maxCount: number = 10): string {
    if (!files || files.length === 0) {
      return 'No files found.';
    }

    const displayFiles = files.slice(0, maxCount);
    const truncated = files.length > maxCount;
    
    const formatted = displayFiles.map(file => {
      const name = file.name || 'Unknown File';
      const size = file.size ? `${Math.round(file.size / 1024)}KB` : 'Unknown size';
      const date = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Unknown date';
      const user = file.userId || 'Unknown user';
      
      return `📎 ${name} (${size}) - uploaded ${date} by ${user}`;
    }).join('\n');
    
    if (truncated) {
      return `${formatted}\n\n... and ${files.length - maxCount} more files (showing first ${maxCount})`;
    }
    
    return formatted;
  }

  static formatMemberList(members: any[], maxCount: number = 15): string {
    if (!members || members.length === 0) {
      return 'No members found.';
    }

    const displayMembers = members.slice(0, maxCount);
    const truncated = members.length > maxCount;
    
    const formatted = displayMembers.map(member => {
      const name = member.name || member.username || 'Unknown';
      const username = member.username ? `@${member.username}` : '';
      const status = member.status ? `(${member.status})` : '';
      const roles = member.roles?.length > 1 ? ` [${member.roles.filter((r: string) => r !== 'user').join(', ')}]` : '';
      
      return `👤 ${name} ${username} ${status}${roles}`.trim();
    }).join('\n');
    
    if (truncated) {
      return `${formatted}\n\n... and ${members.length - maxCount} more members (showing first ${maxCount})`;
    }
    
    return formatted;
  }

  static formatThreadMessages(messages: any[], maxCount: number = 10): string {
    if (!messages || messages.length === 0) {
      return 'No thread messages found.';
    }

    // Use the existing formatMessages but with thread context
    return `🧵 Thread Messages:\n${this.formatMessages(messages, maxCount)}`;
  }

  static formatServerInfo(serverInfo: any): string {
    if (!serverInfo) return 'Server information not available.';
    
    const version = serverInfo.version || 'Unknown';
    const build = serverInfo.build?.date ? new Date(serverInfo.build.date).toLocaleDateString() : 'Unknown';
    const commit = serverInfo.commit?.hash?.substring(0, 7) || 'Unknown';
    
    return `🚀 Rocket.Chat Server Info\n` +
           `Version: ${version}\n` +
           `Build Date: ${build}\n` +
           `Commit: ${commit}`;
  }

  static formatCounters(counters: any): string {
    if (!counters) return 'No counters available.';
    
    return `📊 Room Counters\n` +
           `Members: ${counters.joined || 0}\n` +
           `Messages: ${counters.msgs || 0}\n` +
           `Unread: ${counters.unreads || 0}\n` +
           `Mentions: ${counters.userMentions || 0}`;
  }

  static formatPresence(presence: any): string {
    if (!presence) return 'Presence information not available.';
    
    const status = presence.status || 'unknown';
    const statusText = presence.statusText || 'No status message';
    const lastLogin = presence.lastLogin ? new Date(presence.lastLogin).toLocaleString() : 'Never';
    
    return `👤 User Presence\n` +
           `Status: ${status}\n` +
           `Message: ${statusText}\n` +
           `Last Login: ${lastLogin}`;
  }

  static formatServerStatistics(stats: any): string {
    if (!stats || !stats.success) {
      return `Server Statistics Error: ${stats?.error || 'Unknown error'}`;
    }
    
    let output = `📈 Server Statistics\n`;
    
    // Add key statistics if available
    if (stats.totalUsers) output += `Total Users: ${stats.totalUsers}\n`;
    if (stats.totalRooms) output += `Total Rooms: ${stats.totalRooms}\n`;
    if (stats.totalMessages) output += `Total Messages: ${stats.totalMessages}\n`;
    if (stats.onlineUsers) output += `Online Users: ${stats.onlineUsers}\n`;
    if (stats.uploadsSize) output += `Storage Used: ${Math.round(stats.uploadsSize / 1024 / 1024)}MB\n`;
    
    // If no specific stats, show what's available
    if (output === `📈 Server Statistics\n`) {
      const keys = Object.keys(stats).filter(k => k !== 'success').slice(0, 10);
      keys.forEach(key => {
        if (typeof stats[key] === 'number' || typeof stats[key] === 'string') {
          output += `${key}: ${stats[key]}\n`;
        }
      });
    }
    
    return output;
  }
}

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
              text: ResponseFormatter.formatChannelList(channels, 25),
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
              text: ResponseFormatter.formatMessages(messages, 15),
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
              text: ResponseFormatter.formatMessages(messages, 15),
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
              text: ResponseFormatter.formatMessages(searchResults, 10),
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
              text: ResponseFormatter.formatUserInfo(user),
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
              text: ResponseFormatter.formatRoomInfo(room),
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
              text: ResponseFormatter.formatMemberList(members, 20),
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
              text: `⭐ Starred Messages:\n${ResponseFormatter.formatMessages(messages, 10)}`,
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
              text: `📌 Pinned Messages:\n${ResponseFormatter.formatMessages(messages, 10)}`,
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
              text: `@️ Mentioned Messages:\n${ResponseFormatter.formatMessages(messages, 10)}`,
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
              text: ResponseFormatter.formatThreadMessages(messages, 12),
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
              text: `🧵 Thread List (${validatedArgs.type}):\n${ResponseFormatter.formatMessages(threads, 8)}`,
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
              text: ResponseFormatter.formatFileList(files, 15),
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
              text: ResponseFormatter.formatCounters(counters),
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
              text: ResponseFormatter.formatServerInfo(serverInfo),
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
              text: ResponseFormatter.formatPresence(presence),
            },
          ],
        };
      }

      case 'upload_file': {
        const validatedArgs = uploadFileSchema.parse(args);
        
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
              text: ResponseFormatter.formatSearchResults(result),
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
              text: ResponseFormatter.formatServerStatistics(result),
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

        return {
          content: [
            {
              type: 'text',
              text: ResponseFormatter.formatAnalytics(result),
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

        return {
          content: [
            {
              type: 'text',
              text: ResponseFormatter.formatUserActivity(result),
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