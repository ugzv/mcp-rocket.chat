import fetch from 'node-fetch';

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

  async getMessages(roomId: string, count: number = 20) {
    const result = await this.request(`/channels.messages?roomId=${roomId}&count=${count}`);
    return result.messages || [];
  }

  async searchMessages(query: string, roomId?: string) {
    const params = new URLSearchParams({
      searchText: query,
      ...(roomId && { roomId }),
    });

    const result = await this.request(`/chat.search?${params}`);
    return result.messages || [];
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
}