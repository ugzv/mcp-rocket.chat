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
    const params = new URLSearchParams({
      searchText: query,
      count: count.toString(),
      ...(roomId && { roomId }),
    });

    const result = await this.request(`/chat.search?${params}`);
    return result.messages || [];
  }

  // Add method to get recent messages (last 30 days by default)
  async getRecentMessages(roomId: string, count: number = 20, daysBack: number = 30) {
    const oldest = new Date();
    oldest.setDate(oldest.getDate() - daysBack);
    
    return this.getMessages(roomId, count, new Date().toISOString(), oldest.toISOString());
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
    const result = await this.request(`/rooms.info?roomName=${roomName}`);
    return result.room;
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
}