# Rocket.Chat Events and Notifications Documentation

## Overview

Comprehensive guide for handling server events, real-time notifications, and push notifications in Rocket.Chat.

## Event Types

### Message Events

```javascript
// Message event types
const MessageEvents = {
  MESSAGE_SENT: 'message-sent',
  MESSAGE_UPDATED: 'message-updated',
  MESSAGE_DELETED: 'message-deleted',
  MESSAGE_STARRED: 'message-starred',
  MESSAGE_PINNED: 'message-pinned',
  MESSAGE_REACTED: 'message-reacted',
  MESSAGE_REPORTED: 'message-reported',
  MESSAGE_READ: 'message-read'
};

// Subscribe to message events
const eventHandlers = {
  'message-sent': (data) => {
    console.log('New message:', data.message);
  },
  'message-updated': (data) => {
    console.log('Message edited:', data.message);
  },
  'message-deleted': (data) => {
    console.log('Message deleted:', data.messageId);
  }
};
```

### Room Events

```javascript
// Room event types
const RoomEvents = {
  ROOM_CREATED: 'room-created',
  ROOM_DELETED: 'room-deleted',
  ROOM_ARCHIVED: 'room-archived',
  ROOM_UNARCHIVED: 'room-unarchived',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  USER_ADDED: 'user-added',
  USER_REMOVED: 'user-removed',
  USER_MUTED: 'user-muted',
  USER_UNMUTED: 'user-unmuted',
  OWNER_CHANGED: 'owner-changed',
  MODERATOR_ADDED: 'moderator-added',
  MODERATOR_REMOVED: 'moderator-removed',
  ROOM_NAME_CHANGED: 'room-name-changed',
  ROOM_TOPIC_CHANGED: 'room-topic-changed',
  ROOM_DESCRIPTION_CHANGED: 'room-description-changed',
  ROOM_ANNOUNCEMENT_CHANGED: 'room-announcement-changed',
  ROOM_TYPE_CHANGED: 'room-type-changed'
};
```

### User Events

```javascript
// User event types
const UserEvents = {
  USER_CREATED: 'user-created',
  USER_UPDATED: 'user-updated',
  USER_DELETED: 'user-deleted',
  USER_LOGGED_IN: 'user-logged-in',
  USER_LOGGED_OUT: 'user-logged-out',
  USER_STATUS_CHANGED: 'user-status-changed',
  USER_AVATAR_CHANGED: 'user-avatar-changed',
  USER_ROLE_CHANGED: 'user-role-changed',
  USER_PRESENCE_CHANGED: 'user-presence-changed'
};
```

### Subscription Events

```javascript
// Subscription event types
const SubscriptionEvents = {
  SUBSCRIPTION_CREATED: 'subscription-created',
  SUBSCRIPTION_UPDATED: 'subscription-updated',
  SUBSCRIPTION_DELETED: 'subscription-deleted',
  SUBSCRIPTION_UNREAD: 'subscription-unread',
  SUBSCRIPTION_READ: 'subscription-read',
  SUBSCRIPTION_MENTIONED: 'subscription-mentioned'
};
```

## WebSocket Event Subscription

### Connect and Subscribe

```javascript
const WebSocket = require('ws');

class RocketChatEventListener {
  constructor(url, credentials) {
    this.url = url;
    this.credentials = credentials;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageId = 0;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.on('open', () => {
      console.log('WebSocket connected');
      this.authenticate();
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data));
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    });
  }
  
  authenticate() {
    this.send({
      msg: 'method',
      method: 'login',
      id: String(++this.messageId),
      params: [{
        resume: this.credentials.authToken
      }]
    });
  }
  
  subscribe(stream, params, callback) {
    const id = String(++this.messageId);
    
    this.subscriptions.set(id, callback);
    
    this.send({
      msg: 'sub',
      id: id,
      name: stream,
      params: params
    });
    
    return id;
  }
  
  unsubscribe(subscriptionId) {
    this.subscriptions.delete(subscriptionId);
    
    this.send({
      msg: 'unsub',
      id: subscriptionId
    });
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  handleMessage(message) {
    switch (message.msg) {
      case 'ping':
        this.send({ msg: 'pong' });
        break;
        
      case 'connected':
        console.log('Session connected:', message.session);
        break;
        
      case 'added':
      case 'changed':
      case 'removed':
        this.handleCollectionChange(message);
        break;
        
      case 'result':
        this.handleMethodResult(message);
        break;
        
      case 'ready':
        console.log('Subscription ready:', message.subs);
        break;
        
      case 'nosub':
        console.log('Subscription removed:', message.id);
        break;
    }
  }
  
  handleCollectionChange(message) {
    // Handle real-time data changes
    const { collection, id, fields, msg } = message;
    
    console.log(`Collection ${collection} ${msg}:`, id, fields);
    
    // Trigger callbacks for relevant subscriptions
    this.subscriptions.forEach((callback, subId) => {
      callback({
        type: msg,
        collection,
        id,
        fields
      });
    });
  }
  
  handleMethodResult(message) {
    if (message.error) {
      console.error('Method error:', message.error);
    } else {
      console.log('Method result:', message.result);
    }
  }
  
  reconnect() {
    console.log('Reconnecting in 5 seconds...');
    setTimeout(() => this.connect(), 5000);
  }
}
```

### Subscribe to Specific Events

```javascript
// Subscribe to room messages
listener.subscribe(
  'stream-room-messages',
  ['room-id', false],
  (event) => {
    if (event.type === 'added') {
      console.log('New message in room:', event.fields);
    }
  }
);

// Subscribe to user status changes
listener.subscribe(
  'stream-notify-logged',
  ['user-status', false],
  (event) => {
    console.log('User status changed:', event.fields);
  }
);

// Subscribe to room typing indicators
listener.subscribe(
  'stream-notify-room',
  ['room-id/typing', false],
  (event) => {
    console.log('Typing indicator:', event.fields);
  }
);

// Subscribe to user notifications
listener.subscribe(
  'stream-notify-user',
  ['user-id/notification', false],
  (event) => {
    console.log('User notification:', event.fields);
  }
);
```

## Push Notifications

### Push Configuration

```javascript
// Server push notification settings
{
  "Push_enable": true,
  "Push_enable_gateway": true,
  "Push_gateway": "https://gateway.rocket.chat",
  "Push_production": true,
  "Push_show_username_room": true,
  "Push_show_message": true
}
```

### Register Device for Push

```javascript
// POST /api/v1/push.token
async function registerPushToken(token, type) {
  const response = await fetch(`${baseUrl}/api/v1/push.token`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: type, // 'gcm', 'apn', 'fcm'
      value: token,
      appName: 'RocketChat-MCP'
    })
  });
  
  return response.json();
}

// Unregister device
async function unregisterPushToken(token) {
  const response = await fetch(`${baseUrl}/api/v1/push.token`, {
    method: 'DELETE',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: token
    })
  });
  
  return response.json();
}
```

### Push Notification Preferences

```javascript
// Update push notification preferences
async function updatePushPreferences(preferences) {
  const response = await fetch(`${baseUrl}/api/v1/users.setPreferences`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      data: {
        desktopNotifications: preferences.desktop || 'all',
        mobileNotifications: preferences.mobile || 'all',
        emailNotificationMode: preferences.email || 'mentions',
        pushNotifications: {
          allMessages: preferences.allMessages || false,
          onlyMentions: preferences.onlyMentions || true,
          showMessagePreview: preferences.showPreview || true
        }
      }
    })
  });
  
  return response.json();
}
```

## Desktop Notifications

### Request Permission

```javascript
class DesktopNotificationManager {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  async showNotification(title, options = {}) {
    if (await this.requestPermission()) {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/images/logo.png',
        badge: options.badge || '/images/badge.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });
      
      notification.onclick = () => {
        window.focus();
        if (options.onClick) {
          options.onClick();
        }
        notification.close();
      };
      
      return notification;
    }
  }
}
```

### Handle Incoming Notifications

```javascript
class NotificationHandler {
  constructor() {
    this.notificationManager = new DesktopNotificationManager();
    this.soundEnabled = true;
  }
  
  handleMessage(message) {
    // Check if message should trigger notification
    if (this.shouldNotify(message)) {
      this.showNotification(message);
      
      if (this.soundEnabled) {
        this.playSound();
      }
    }
  }
  
  shouldNotify(message) {
    // Don't notify for own messages
    if (message.u._id === userId) {
      return false;
    }
    
    // Check notification preferences
    const preferences = this.getPreferences();
    
    if (preferences === 'nothing') {
      return false;
    }
    
    if (preferences === 'mentions') {
      return this.isMentioned(message);
    }
    
    return true; // 'all' setting
  }
  
  isMentioned(message) {
    if (message.mentions) {
      return message.mentions.some(m => m._id === userId);
    }
    return false;
  }
  
  showNotification(message) {
    const title = `${message.u.username} in ${message.rid}`;
    const body = message.msg;
    
    this.notificationManager.showNotification(title, {
      body: body,
      tag: message._id,
      data: {
        roomId: message.rid,
        messageId: message._id
      },
      onClick: () => {
        // Navigate to message
        this.navigateToMessage(message.rid, message._id);
      }
    });
  }
  
  playSound() {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(e => console.error('Failed to play sound:', e));
  }
  
  navigateToMessage(roomId, messageId) {
    // Implementation depends on your app
    window.location.href = `/room/${roomId}?msg=${messageId}`;
  }
}
```

## Email Notifications

### Email Notification Settings

```javascript
// Configure email notifications
async function configureEmailNotifications(settings) {
  const response = await fetch(`${baseUrl}/api/v1/users.setPreferences`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      data: {
        emailNotificationMode: settings.mode, // 'all', 'mentions', 'nothing'
        highlights: settings.highlights || [],
        desktopNotificationRequireInteraction: settings.requireInteraction || false,
        unreadAlert: settings.unreadAlert || true
      }
    })
  });
  
  return response.json();
}
```

## Custom Event Handlers

### Event Emitter Pattern

```javascript
const EventEmitter = require('events');

class RocketChatEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0); // Unlimited listeners
  }
  
  // Register event handlers
  onMessage(callback) {
    this.on('message', callback);
  }
  
  onRoomUpdate(callback) {
    this.on('room-update', callback);
  }
  
  onUserPresence(callback) {
    this.on('user-presence', callback);
  }
  
  onTyping(callback) {
    this.on('typing', callback);
  }
  
  onNotification(callback) {
    this.on('notification', callback);
  }
  
  // Emit events
  emitMessage(data) {
    this.emit('message', data);
  }
  
  emitRoomUpdate(data) {
    this.emit('room-update', data);
  }
  
  emitUserPresence(data) {
    this.emit('user-presence', data);
  }
  
  emitTyping(data) {
    this.emit('typing', data);
  }
  
  emitNotification(data) {
    this.emit('notification', data);
  }
}

// Usage
const eventBus = new RocketChatEventBus();

eventBus.onMessage((message) => {
  console.log('New message:', message);
  // Update UI
  // Store in database
  // Send notification
});

eventBus.onUserPresence((presence) => {
  console.log('User presence changed:', presence);
  // Update user status indicator
});

eventBus.onTyping((typing) => {
  console.log('Typing indicator:', typing);
  // Show/hide typing indicator
});
```

### Event Aggregation

```javascript
class EventAggregator {
  constructor(flushInterval = 1000) {
    this.events = [];
    this.flushInterval = flushInterval;
    this.timer = null;
  }
  
  add(event) {
    this.events.push({
      ...event,
      timestamp: Date.now()
    });
    
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }
  
  flush() {
    if (this.events.length === 0) {
      return;
    }
    
    // Group events by type
    const grouped = this.events.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = [];
      }
      acc[event.type].push(event);
      return acc;
    }, {});
    
    // Process grouped events
    Object.entries(grouped).forEach(([type, events]) => {
      this.processEventGroup(type, events);
    });
    
    // Clear events
    this.events = [];
    this.timer = null;
  }
  
  processEventGroup(type, events) {
    console.log(`Processing ${events.length} ${type} events`);
    
    switch (type) {
      case 'message':
        this.processMessages(events);
        break;
      case 'presence':
        this.processPresenceUpdates(events);
        break;
      case 'notification':
        this.processNotifications(events);
        break;
    }
  }
  
  processMessages(messages) {
    // Batch process messages
    const byRoom = messages.reduce((acc, msg) => {
      if (!acc[msg.roomId]) {
        acc[msg.roomId] = [];
      }
      acc[msg.roomId].push(msg);
      return acc;
    }, {});
    
    // Update UI for each room
    Object.entries(byRoom).forEach(([roomId, roomMessages]) => {
      this.updateRoomMessages(roomId, roomMessages);
    });
  }
  
  processPresenceUpdates(updates) {
    // Get latest presence for each user
    const latestPresence = updates.reduce((acc, update) => {
      acc[update.userId] = update;
      return acc;
    }, {});
    
    // Update presence indicators
    Object.values(latestPresence).forEach(presence => {
      this.updateUserPresence(presence);
    });
  }
  
  processNotifications(notifications) {
    // Show notifications
    notifications.forEach(notification => {
      this.showNotification(notification);
    });
  }
}
```

## Webhook Event Notifications

### Configure Webhook for Events

```javascript
// Create outgoing webhook for events
async function createEventWebhook(events, targetUrl) {
  const response = await fetch(`${baseUrl}/api/v1/integrations.create`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'webhook-outgoing',
      name: 'Event Notification Webhook',
      enabled: true,
      event: events.join(','), // 'sendMessage,roomArchived,userCreated'
      urls: [targetUrl],
      scriptEnabled: false,
      channel: 'all'
    })
  });
  
  return response.json();
}
```

### Process Webhook Events

```javascript
// Express endpoint to receive webhook events
const express = require('express');
const app = express();

app.post('/webhook/events', express.json(), (req, res) => {
  const event = req.body;
  
  console.log('Received event:', event);
  
  // Process based on event type
  switch (event.event) {
    case 'sendMessage':
      handleMessageSent(event);
      break;
      
    case 'roomArchived':
      handleRoomArchived(event);
      break;
      
    case 'userCreated':
      handleUserCreated(event);
      break;
      
    default:
      console.log('Unknown event type:', event.event);
  }
  
  res.json({ success: true });
});

function handleMessageSent(event) {
  // Process new message
  const { message_id, user_id, channel_id, text } = event;
  console.log(`Message from ${user_id} in ${channel_id}: ${text}`);
}

function handleRoomArchived(event) {
  // Process room archived
  const { room_id, archived_by } = event;
  console.log(`Room ${room_id} archived by ${archived_by}`);
}

function handleUserCreated(event) {
  // Process new user
  const { user_id, username, email } = event;
  console.log(`New user created: ${username} (${email})`);
}
```

## Performance Optimization

### Event Debouncing

```javascript
class EventDebouncer {
  constructor(delay = 300) {
    this.delay = delay;
    this.timers = new Map();
  }
  
  debounce(key, callback) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(key);
    }, this.delay);
    
    this.timers.set(key, timer);
  }
}

// Usage
const debouncer = new EventDebouncer();

// Debounce typing indicators
function handleTyping(userId, roomId, isTyping) {
  const key = `typing-${userId}-${roomId}`;
  
  debouncer.debounce(key, () => {
    updateTypingIndicator(userId, roomId, isTyping);
  });
}
```

### Event Throttling

```javascript
class EventThrottler {
  constructor(limit = 100) {
    this.limit = limit;
    this.lastCall = new Map();
  }
  
  throttle(key, callback) {
    const now = Date.now();
    const lastTime = this.lastCall.get(key) || 0;
    
    if (now - lastTime >= this.limit) {
      this.lastCall.set(key, now);
      callback();
      return true;
    }
    
    return false;
  }
}

// Usage
const throttler = new EventThrottler(1000); // 1 second throttle

// Throttle presence updates
function handlePresenceUpdate(userId, status) {
  const key = `presence-${userId}`;
  
  throttler.throttle(key, () => {
    updateUserPresence(userId, status);
  });
}
```