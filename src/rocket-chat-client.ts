import fetch from 'node-fetch';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import * as mimeTypes from 'mime-types';

export interface RocketChatConfig {
  baseUrl: string;
  userId: string;
  authToken: string;
}

export class RocketChatClient {
  private baseUrl: string;
  private userId: string;
  private authToken: string;

  constructor(config: RocketChatConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.userId = config.userId;
    this.authToken = config.authToken;
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Token': this.authToken,
        'X-User-Id': this.userId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Request was not successful');
    }

    return data;
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
    let endpoint = '/rooms.get';
    
    if (type === 'public') {
      endpoint = '/channels.list';
    } else if (type === 'private') {
      endpoint = '/groups.list';
    } else if (type === 'direct') {
      endpoint = '/im.list';
    }

    const result = await this.request(endpoint);
    
    if (type === 'public') {
      return result.channels || [];
    } else if (type === 'private') {
      return result.groups || [];
    } else if (type === 'direct') {
      return result.ims || [];
    }
    
    return result.update || [];
  }

  async getMessages(roomId: string, count: number = 20, latest?: string, oldest?: string) {
    // Try different endpoints for different room types
    const params = new URLSearchParams({
      roomId,
      count: count.toString(),
      ...(latest && { latest }),
      ...(oldest && { oldest })
    });
    
    const endpoints = [
      `/channels.history?${params}`,
      `/groups.history?${params}`,
      `/dm.history?${params}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.request(endpoint);
        return result.messages || [];
      } catch (error: any) {
        // Continue to next endpoint if this one fails
        continue;
      }
    }
    
    throw new Error('Unable to fetch messages - room not found or no access');
  }

  async searchMessages(query: string, roomId?: string, count: number = 20) {
    // If roomId is provided, search within that room
    if (roomId) {
      // Many servers disable chat.search endpoint, so we use fallback approach as primary method
      console.warn('Using fallback search method - fetching recent messages and filtering locally');
      
      try {
        // Primary method: Get recent messages and filter locally (more reliable)
        const searchCount = Math.min(count * 5, 200); // Get more messages to search through
        const recentMessages = await this.getMessages(roomId, searchCount);
        const filtered = recentMessages.filter((msg: any) => 
          msg.msg && msg.msg.toLowerCase().includes(query.toLowerCase())
        );
        return filtered.slice(0, count);
      } catch (fallbackError: any) {
        // Last resort: Try the direct search API if fallback fails
        try {
          const params = new URLSearchParams({
            roomId: roomId,
            searchText: query,
            count: count.toString(),
          });
          
          const result = await this.request(`/chat.search?${params}`);
          return result.messages || [];
        } catch (searchError: any) {
          throw new Error(`Search failed: ${fallbackError.message}. Direct search also failed: ${searchError.message}`);
        }
      }
    } else {
      // Global search without room restriction
      try {
        const params = new URLSearchParams({
          searchText: query,
          count: count.toString(),
        });
        
        const result = await this.request(`/chat.search?${params}`);
        return result.messages || [];
      } catch (searchError: any) {
        // If global search fails, try searching across accessible rooms
        try {
          console.warn('Global search failed, trying to search across accessible rooms');
          const rooms = await this.listChannels();
          let allMessages: any[] = [];
          
          // Search through first few accessible rooms
          for (const room of rooms.slice(0, 5)) {
            try {
              const roomMessages = await this.getMessages(room._id, Math.max(20, Math.floor(count / 5)));
              const filtered = roomMessages.filter((msg: any) => 
                msg.msg && msg.msg.toLowerCase().includes(query.toLowerCase())
              );
              allMessages = allMessages.concat(filtered);
              
              // Stop if we have enough results
              if (allMessages.length >= count) break;
            } catch (roomError) {
              // Skip rooms we can't access
              continue;
            }
          }
          
          // Sort by timestamp (newest first) and limit results
          allMessages.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
          return allMessages.slice(0, count);
        } catch (fallbackError: any) {
          throw new Error(`Search failed: ${searchError.message}. Room-based fallback also failed: ${fallbackError.message}`);
        }
      }
    }
  }

  // Add method to get recent messages (last 30 days by default)
  async getRecentMessages(roomId: string, count: number = 20, daysBack: number = 30) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // RC API expects latest (end date) and oldest (start date) parameters
    // For recent messages: latest=now, oldest=startDate
    return this.getMessages(roomId, count, now.toISOString(), startDate.toISOString());
  }

  async createChannel(name: string, members?: string[], readOnly?: boolean) {
    return this.request('/channels.create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        ...(members && { members }),
        ...(readOnly !== undefined && { readOnly }),
      }),
    });
  }

  async getUserInfo(username: string) {
    const result = await this.request(`/users.info?username=${username}`);
    return result.user;
  }

  async getRoomInfo(roomName: string) {
    // Clean room name (remove # if present)
    const cleanRoomName = roomName.startsWith('#') ? roomName.slice(1) : roomName;
    
    // Try ID-based lookup first if roomName looks like an ID
    if (cleanRoomName.length > 15 && !cleanRoomName.includes(' ')) {
      const idEndpoints = [
        `/channels.info?roomId=${encodeURIComponent(cleanRoomName)}`,
        `/groups.info?roomId=${encodeURIComponent(cleanRoomName)}`,
        `/rooms.info?roomId=${encodeURIComponent(cleanRoomName)}`
      ];
      
      for (const endpoint of idEndpoints) {
        try {
          const result = await this.request(endpoint);
          return result.channel || result.group || result.room;
        } catch (error) {
          continue;
        }
      }
    }
    
    // Try name-based lookup
    const nameEndpoints = [
      `/channels.info?roomName=${encodeURIComponent(cleanRoomName)}`,
      `/groups.info?roomName=${encodeURIComponent(cleanRoomName)}`
    ];
    
    for (const endpoint of nameEndpoints) {
      try {
        const result = await this.request(endpoint);
        return result.channel || result.group || result.room;
      } catch (error) {
        continue;
      }
    }
    
    // Final fallback: search in room list
    try {
      const rooms = await this.listChannels();
      const foundRoom = rooms.find((room: any) => 
        room.name === cleanRoomName || room.fname === cleanRoomName
      );
      if (foundRoom) {
        return foundRoom;
      }
    } catch (error) {
      // Continue to error
    }
    
    throw new Error(`Unable to fetch room info for '${roomName}' - room not found or no access`);
  }

  async joinChannel(roomId: string) {
    return this.request('/channels.join', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
      }),
    });
  }

  async leaveChannel(roomId: string) {
    return this.request('/channels.leave', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
      }),
    });
  }

  async setTopic(roomId: string, topic: string) {
    return this.request('/channels.setTopic', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        topic,
      }),
    });
  }

  async testConnection() {
    try {
      const result = await this.request('/me');
      return {
        success: true,
        user: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  async updateMessage(roomId: string, msgId: string, text: string) {
    return this.request('/chat.update', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        msgId,
        text,
      }),
    });
  }

  async deleteMessage(roomId: string, msgId: string) {
    return this.request('/chat.delete', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        msgId,
      }),
    });
  }

  async reactToMessage(messageId: string, emoji: string, shouldReact: boolean = true) {
    return this.request('/chat.react', {
      method: 'POST',
      body: JSON.stringify({
        messageId,
        emoji,
        shouldReact,
      }),
    });
  }

  async pinMessage(messageId: string) {
    return this.request('/chat.pinMessage', {
      method: 'POST',
      body: JSON.stringify({
        messageId,
      }),
    });
  }

  async unpinMessage(messageId: string) {
    return this.request('/chat.unPinMessage', {
      method: 'POST',
      body: JSON.stringify({
        messageId,
      }),
    });
  }

  async getChannelMembers(roomId: string, offset: number = 0, count: number = 50) {
    // Try different endpoints for different room types
    const endpoints = [
      `/channels.members?roomId=${roomId}&offset=${offset}&count=${count}`,
      `/groups.members?roomId=${roomId}&offset=${offset}&count=${count}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.request(endpoint);
        return result.members || [];
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to fetch members - room not found or no access');
  }

  async inviteToChannel(roomId: string, userId: string) {
    // Try different endpoints for different room types
    const endpoints = [
      { endpoint: '/channels.invite', body: { roomId, userId } },
      { endpoint: '/groups.invite', body: { roomId, userId } }
    ];
    
    for (const { endpoint, body } of endpoints) {
      try {
        return await this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to invite user - room not found or no access');
  }

  async removeFromChannel(roomId: string, userId: string) {
    // Try different endpoints for different room types
    const endpoints = [
      { endpoint: '/channels.kick', body: { roomId, userId } },
      { endpoint: '/groups.kick', body: { roomId, userId } }
    ];
    
    for (const { endpoint, body } of endpoints) {
      try {
        return await this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to remove user - room not found or no access');
  }

  async setChannelAnnouncement(roomId: string, announcement: string) {
    // Try different endpoints for different room types
    const endpoints = [
      { endpoint: '/channels.setAnnouncement', body: { roomId, announcement } },
      { endpoint: '/groups.setAnnouncement', body: { roomId, announcement } }
    ];
    
    for (const { endpoint, body } of endpoints) {
      try {
        return await this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to set announcement - room not found or no access');
  }

  async setChannelDescription(roomId: string, description: string) {
    // Try different endpoints for different room types
    const endpoints = [
      { endpoint: '/channels.setDescription', body: { roomId, description } },
      { endpoint: '/groups.setDescription', body: { roomId, description } }
    ];
    
    for (const { endpoint, body } of endpoints) {
      try {
        return await this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to set description - room not found or no access');
  }

  // Advanced message operations
  async getStarredMessages(roomId: string, count: number = 20) {
    const result = await this.request(`/chat.getStarredMessages?roomId=${roomId}&count=${count}`);
    return result.messages || [];
  }

  async getPinnedMessages(roomId: string, count: number = 20) {
    const result = await this.request(`/chat.getPinnedMessages?roomId=${roomId}&count=${count}`);
    return result.messages || [];
  }

  async getMentionedMessages(roomId: string, count: number = 20) {
    const result = await this.request(`/chat.getMentionedMessages?roomId=${roomId}&count=${count}`);
    return result.messages || [];
  }

  // Integration management
  async createWebhook(webhookData: {
    type: 'webhook-incoming' | 'webhook-outgoing';
    name: string;
    enabled?: boolean;
    username?: string;
    urls?: string[];
    channel?: string;
    alias?: string;
    avatar?: string;
    emoji?: string;
    triggerWords?: string[];
    event?: string;
  }) {
    return this.request('/integrations.create', {
      method: 'POST',
      body: JSON.stringify(webhookData),
    });
  }

  async listIntegrations(offset: number = 0, count: number = 50) {
    const result = await this.request(`/integrations.list?offset=${offset}&count=${count}`);
    return result.integrations || [];
  }

  async deleteIntegration(type: 'webhook-incoming' | 'webhook-outgoing', integrationId: string) {
    return this.request('/integrations.remove', {
      method: 'DELETE',
      body: JSON.stringify({
        type,
        integrationId,
      }),
    });
  }

  // User presence and status
  async getUserPresence(userId: string) {
    const result = await this.request(`/users.getPresence?userId=${userId}`);
    return result.presence;
  }

  async setUserStatus(status: 'online' | 'away' | 'busy' | 'offline', message?: string) {
    return this.request('/users.setStatus', {
      method: 'POST',
      body: JSON.stringify({
        status,
        ...(message && { message }),
      }),
    });
  }

  // Advanced room operations
  async getRoomCounters(roomId: string) {
    // Try different endpoints for different room types
    const endpoints = [
      `/channels.counters?roomId=${roomId}`,
      `/groups.counters?roomId=${roomId}`,
      `/dm.counters?roomId=${roomId}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.request(endpoint);
        return result;
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to get counters - room not found or no access');
  }

  async getRoomFiles(roomId: string, offset: number = 0, count: number = 50, sort?: object) {
    // Try different endpoints for different room types  
    const params = new URLSearchParams({
      roomId,
      offset: offset.toString(),
      count: count.toString(),
      ...(sort && { sort: JSON.stringify(sort) })
    });
    
    const endpoints = [
      `/channels.files?${params}`,
      `/groups.files?${params}`,
      `/dm.files?${params}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.request(endpoint);
        return result.files || [];
      } catch (error: any) {
        continue;
      }
    }
    
    throw new Error('Unable to get files - room not found or no access');
  }

  // Thread operations
  async getThreadMessages(tmid: string, count: number = 50) {
    const result = await this.request(`/chat.getThreadMessages?tmid=${tmid}&count=${count}`);
    return result.messages || [];
  }

  async getThreadsList(roomId: string, type: 'all' | 'unread' | 'following' = 'all', count: number = 50) {
    const result = await this.request(`/chat.getThreadsList?rid=${roomId}&type=${type}&count=${count}`);
    return result.threads || [];
  }

  async followMessage(messageId: string) {
    return this.request('/chat.followMessage', {
      method: 'POST',
      body: JSON.stringify({
        mid: messageId,
      }),
    });
  }

  async unfollowMessage(messageId: string) {
    return this.request('/chat.unfollowMessage', {
      method: 'POST',
      body: JSON.stringify({
        mid: messageId,
      }),
    });
  }

  // Server and statistics
  async getServerInfo() {
    const result = await this.request('/info');
    return result;
  }

  async getStatistics() {
    const result = await this.request('/statistics');
    return result;
  }

  // File upload and download functionality
  async uploadFile(roomId: string, filePath: string, description?: string, threadId?: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const form = new FormData();
    const fileName = path.basename(filePath);
    const mimeType = mimeTypes.lookup(filePath) || 'application/octet-stream';
    
    form.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: mimeType
    });
    
    if (description) {
      form.append('msg', description);
      form.append('description', description);
    }
    
    if (threadId) {
      form.append('tmid', threadId);
    }

    const url = `${this.baseUrl}/api/v1/rooms.upload/${roomId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Auth-Token': this.authToken,
        'X-User-Id': this.userId,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.error || `Upload failed: ${response.statusText}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Upload was not successful');
    }

    return data;
  }

  async downloadFile(fileId: string, fileName: string, savePath?: string): Promise<{
    success: boolean;
    size: number;
    path?: string;
    data?: string;
    mimeType?: string;
  }> {
    const url = `${this.baseUrl}/file-upload/${fileId}/${fileName}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': this.authToken,
        'X-User-Id': this.userId
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    if (savePath) {
      // Save to file system
      const dir = path.dirname(savePath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(savePath, buffer);
      return {
        success: true,
        path: savePath,
        size: buffer.length
      };
    } else {
      // Return as base64
      return {
        success: true,
        data: buffer.toString('base64'),
        size: buffer.length,
        mimeType: response.headers.get('content-type') || 'application/octet-stream'
      };
    }
  }

  async deleteFile(fileId: string) {
    return this.request('/rooms.deleteFile', {
      method: 'POST',
      body: JSON.stringify({ fileId })
    });
  }

  async validateFileType(filePath: string, allowedTypes?: string[], maxSize?: number) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const mimeType = mimeTypes.lookup(filePath);
    
    if (!mimeType) {
      throw new Error('Unable to determine file type');
    }

    // Check allowed types
    if (allowedTypes && !allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size (default 100MB)
    const defaultMaxSize = 100 * 1024 * 1024; // 100MB
    const sizeLimit = maxSize || defaultMaxSize;
    
    if (stats.size > sizeLimit) {
      throw new Error(`File size (${stats.size} bytes) exceeds maximum of ${sizeLimit} bytes`);
    }

    return {
      valid: true,
      size: stats.size,
      mimeType,
      fileName: path.basename(filePath)
    };
  }

  async sendMessageWithAttachment(channel: string, text: string, filePath: string, threadId?: string) {
    // Get room ID first
    const roomInfo = await this.getRoomInfo(channel);
    const roomId = roomInfo._id;

    // Upload file
    const uploadResult = await this.uploadFile(roomId, filePath, text, threadId);
    
    return {
      success: true,
      message: uploadResult.message,
      file: uploadResult.message.file
    };
  }

  // Advanced search capabilities
  async advancedSearch(options: {
    query: string;
    roomId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    messageType?: 'all' | 'mentions' | 'starred' | 'pinned';
    sortBy?: 'timestamp' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    count?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    
    // Basic search parameters
    params.append('searchText', options.query);
    if (options.roomId) params.append('roomId', options.roomId);
    if (options.count) params.append('count', options.count.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    
    try {
      const result = await this.request(`/chat.search?${params}`);
      let messages = result.messages || [];
      
      // Apply additional client-side filtering
      if (options.userId) {
        messages = messages.filter((msg: any) => msg.u?._id === options.userId);
      }
      
      if (options.dateFrom) {
        const fromDate = new Date(options.dateFrom);
        messages = messages.filter((msg: any) => new Date(msg.ts) >= fromDate);
      }
      
      if (options.dateTo) {
        const toDate = new Date(options.dateTo);
        messages = messages.filter((msg: any) => new Date(msg.ts) <= toDate);
      }
      
      // Filter by message type
      if (options.messageType && options.messageType !== 'all') {
        switch (options.messageType) {
          case 'mentions':
            messages = messages.filter((msg: any) => msg.mentions?.length > 0);
            break;
          case 'starred':
            messages = messages.filter((msg: any) => msg.starred);
            break;
          case 'pinned':
            messages = messages.filter((msg: any) => msg.pinned);
            break;
        }
      }
      
      // Apply sorting
      if (options.sortBy === 'timestamp') {
        messages.sort((a: any, b: any) => {
          const dateA = new Date(a.ts).getTime();
          const dateB = new Date(b.ts).getTime();
          return options.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      }
      
      return {
        success: true,
        messages,
        total: messages.length,
        query: options.query,
        filters: {
          roomId: options.roomId,
          userId: options.userId,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          messageType: options.messageType
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        messages: [],
        total: 0
      };
    }
  }

  async globalSearch(options: {
    query: string;
    searchType?: 'messages' | 'rooms' | 'users' | 'all';
    limit?: number;
  }) {
    const results: any = {
      success: true,
      query: options.query,
      results: {
        messages: [],
        rooms: [],
        users: []
      },
      totals: {
        messages: 0,
        rooms: 0,
        users: 0
      }
    };

    try {
      // Search messages globally (across accessible rooms)
      if (options.searchType === 'messages' || options.searchType === 'all') {
        try {
          const messageSearch = await this.request(`/chat.search?searchText=${encodeURIComponent(options.query)}&count=${options.limit || 50}`);
          results.results.messages = messageSearch.messages || [];
          results.totals.messages = results.results.messages.length;
        } catch (error) {
          console.warn('Global message search failed:', error);
        }
      }

      // Search rooms
      if (options.searchType === 'rooms' || options.searchType === 'all') {
        try {
          const rooms = await this.listChannels();
          const filteredRooms = rooms.filter((room: any) => 
            room.name?.toLowerCase().includes(options.query.toLowerCase()) ||
            room.topic?.toLowerCase().includes(options.query.toLowerCase()) ||
            room.description?.toLowerCase().includes(options.query.toLowerCase())
          ).slice(0, options.limit || 20);
          
          results.results.rooms = filteredRooms;
          results.totals.rooms = filteredRooms.length;
        } catch (error) {
          console.warn('Room search failed:', error);
        }
      }

      // Search users (if we have access)
      if (options.searchType === 'users' || options.searchType === 'all') {
        try {
          // This would require admin privileges in most cases
          const userSearch = await this.request(`/users.list?query={"name":{"$regex":"${options.query}","$options":"i"}}&count=${options.limit || 20}`);
          results.results.users = userSearch.users || [];
          results.totals.users = results.results.users.length;
        } catch (error) {
          console.warn('User search failed (may require admin privileges):', error);
        }
      }

      return results;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        query: options.query,
        results: { messages: [], rooms: [], users: [] },
        totals: { messages: 0, rooms: 0, users: 0 }
      };
    }
  }

  // Analytics and insights functionality
  async getServerStatistics() {
    try {
      const result = await this.request('/statistics');
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getRoomAnalytics(roomId: string, options?: {
    dateFrom?: string;
    dateTo?: string;
    includeMessages?: boolean;
    includeFiles?: boolean;
    includeMembers?: boolean;
  }) {
    const analytics: any = {
      success: true,
      roomId,
      period: {
        from: options?.dateFrom,
        to: options?.dateTo
      },
      metrics: {}
    };

    try {
      // Get basic room info and counters
      const counters = await this.getRoomCounters(roomId);
      analytics.metrics.counters = counters;

      // Get recent messages for analysis
      if (options?.includeMessages !== false) {
        const messages = await this.getMessages(roomId, 100);
        
        // Analyze message patterns
        const messageAnalysis = this.analyzeMessages(messages, options?.dateFrom, options?.dateTo);
        analytics.metrics.messages = messageAnalysis;
      }

      // Get files info
      if (options?.includeFiles) {
        const files = await this.getRoomFiles(roomId, 0, 100);
        const fileAnalysis = this.analyzeFiles(files);
        analytics.metrics.files = fileAnalysis;
      }

      // Get member info
      if (options?.includeMembers) {
        try {
          const members = await this.getChannelMembers(roomId, 0, 100);
          const memberAnalysis = this.analyzeMembers(members);
          analytics.metrics.members = memberAnalysis;
        } catch (error) {
          console.warn('Failed to get member analytics:', error);
        }
      }

      return analytics;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        roomId
      };
    }
  }

  async getUserActivitySummary(userId: string, options?: {
    dateFrom?: string;
    dateTo?: string;
    includeRooms?: string[];
  }) {
    try {
      const activity: any = {
        success: true,
        userId,
        period: {
          from: options?.dateFrom,
          to: options?.dateTo
        },
        metrics: {
          totalMessages: 0,
          activeRooms: [],
          mostActiveRoom: null,
          timeDistribution: {},
          messageTypes: {
            text: 0,
            files: 0,
            reactions: 0
          }
        }
      };

      // Get user info
      const userInfo = await this.request(`/users.info?userId=${userId}`);
      activity.user = userInfo.user;

      // If specific rooms are provided, analyze those; otherwise get all accessible rooms
      let rooms = [];
      if (options?.includeRooms?.length) {
        rooms = options.includeRooms.map(id => ({ _id: id }));
      } else {
        rooms = await this.listChannels();
      }

      // Analyze user activity across rooms
      for (const room of rooms.slice(0, 10)) { // Limit to prevent too many requests
        try {
          const messages = await this.getMessages(room._id, 50);
          const userMessages = messages.filter((msg: any) => msg.u?._id === userId);
          
          if (userMessages.length > 0) {
            activity.metrics.totalMessages += userMessages.length;
            activity.metrics.activeRooms.push({
              roomId: room._id,
              roomName: room.name,
              messageCount: userMessages.length
            });

            // Analyze message types and timing
            userMessages.forEach((msg: any) => {
              if (msg.file) {
                activity.metrics.messageTypes.files++;
              } else {
                activity.metrics.messageTypes.text++;
              }

              // Time distribution analysis
              const hour = new Date(msg.ts).getHours();
              activity.metrics.timeDistribution[hour] = (activity.metrics.timeDistribution[hour] || 0) + 1;
            });
          }
        } catch (error) {
          console.warn(`Failed to analyze room ${room._id}:`, error);
        }
      }

      // Find most active room
      if (activity.metrics.activeRooms.length > 0) {
        activity.metrics.mostActiveRoom = activity.metrics.activeRooms.reduce((prev: any, current: any) => 
          prev.messageCount > current.messageCount ? prev : current
        );
      }

      return activity;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  // Helper methods for analytics
  private analyzeMessages(messages: any[], dateFrom?: string, dateTo?: string) {
    let filteredMessages = messages;
    
    // Apply date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredMessages = filteredMessages.filter(msg => new Date(msg.ts) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      filteredMessages = filteredMessages.filter(msg => new Date(msg.ts) <= toDate);
    }

    const analysis: any = {
      total: filteredMessages.length,
      byUser: {},
      byType: { text: 0, file: 0, system: 0 },
      byHour: {},
      byDay: {},
      averageLength: 0,
      mostActive: null
    };

    let totalLength = 0;

    filteredMessages.forEach(msg => {
      // By user
      const userId = msg.u?._id;
      if (userId) {
        analysis.byUser[userId] = analysis.byUser[userId] || { 
          count: 0, 
          username: msg.u.username,
          name: msg.u.name 
        };
        analysis.byUser[userId].count++;
      }

      // By type
      if (msg.file) {
        analysis.byType.file++;
      } else if (msg.u?.username === 'rocket.cat') {
        analysis.byType.system++;
      } else {
        analysis.byType.text++;
      }

      // By time
      const date = new Date(msg.ts);
      const hour = date.getHours();
      const day = date.toDateString();
      
      analysis.byHour[hour] = (analysis.byHour[hour] || 0) + 1;
      analysis.byDay[day] = (analysis.byDay[day] || 0) + 1;

      // Message length
      if (msg.msg) {
        totalLength += msg.msg.length;
      }
    });

    // Calculate average message length
    if (filteredMessages.length > 0) {
      analysis.averageLength = Math.round(totalLength / filteredMessages.length);
    }

    // Find most active user
    const userEntries = Object.entries(analysis.byUser) as [string, any][];
    if (userEntries.length > 0) {
      analysis.mostActive = userEntries.reduce((prev, current) => 
        prev[1].count > current[1].count ? prev : current
      )[1];
    }

    return analysis;
  }

  private analyzeFiles(files: any[]) {
    const analysis: any = {
      total: files.length,
      byType: {},
      byUser: {},
      totalSize: 0,
      averageSize: 0,
      largestFile: null
    };

    files.forEach(file => {
      // By type
      const type = file.type || 'unknown';
      const category = this.getFileCategory(type);
      analysis.byType[category] = (analysis.byType[category] || 0) + 1;

      // By user
      const userId = file.userId;
      if (userId) {
        analysis.byUser[userId] = (analysis.byUser[userId] || 0) + 1;
      }

      // Size analysis
      if (file.size) {
        analysis.totalSize += file.size;
        if (!analysis.largestFile || file.size > analysis.largestFile.size) {
          analysis.largestFile = file;
        }
      }
    });

    if (files.length > 0) {
      analysis.averageSize = Math.round(analysis.totalSize / files.length);
    }

    return analysis;
  }

  private analyzeMembers(members: any[]) {
    const analysis: any = {
      total: members.length,
      byStatus: { online: 0, away: 0, busy: 0, offline: 0 },
      byRole: {},
      joinedRecently: 0 // Within last 30 days
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    members.forEach(member => {
      // By status
      const status = member.status || 'offline';
      analysis.byStatus[status] = (analysis.byStatus[status] || 0) + 1;

      // By role
      const roles = member.roles || ['user'];
      roles.forEach((role: string) => {
        analysis.byRole[role] = (analysis.byRole[role] || 0) + 1;
      });

      // Recent joins
      if (member.joinedAt && new Date(member.joinedAt) > thirtyDaysAgo) {
        analysis.joinedRecently++;
      }
    });

    return analysis;
  }

  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'documents';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheets';
    if (mimeType.includes('text/')) return 'text';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archives';
    return 'other';
  }
}