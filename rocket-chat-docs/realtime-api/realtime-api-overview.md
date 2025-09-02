# Rocket.Chat Realtime API Documentation

## Overview

The Rocket.Chat Realtime API is based on DDP (Distributed Data Protocol) and provides real-time bidirectional communication between clients and the Rocket.Chat server. This API enables real-time updates for messages, user presence, room changes, and other live events.

> **⚠️ Important Notice**: The DDP methods (Realtime API) are deprecated as of 2025. They are no longer actively tested or maintained, and their behavior may be unreliable. For new development and long-term support, REST APIs are strongly recommended instead.

## Connection

### WebSocket Connection

The Realtime API uses WebSocket connections for communication:

```javascript
// Connection URL
wss://your-rocket-chat-server.com/websocket

// Example connection using DDP
const ddp = new DDP({
  host: 'your-rocket-chat-server.com',
  port: 443,
  ssl: true,
  maintainCollections: true
});
```

## Authentication

### Login Method

```javascript
// Login with username and password
{
  "msg": "method",
  "method": "login",
  "id": "42",
  "params": [{
    "user": { "username": "username" },
    "password": {
      "digest": "sha256-hash-of-password",
      "algorithm": "sha-256"
    }
  }]
}

// Login with auth token
{
  "msg": "method",
  "method": "login",
  "id": "42",
  "params": [{
    "resume": "auth-token"
  }]
}
```

### Response

```javascript
{
  "msg": "result",
  "id": "42",
  "result": {
    "id": "user-id",
    "token": "auth-token",
    "tokenExpires": {
      "$date": 1234567890000
    }
  }
}
```

## Subscriptions

### Available Subscriptions

#### 1. Room Messages

Subscribe to messages in a room:

```javascript
{
  "msg": "sub",
  "id": "unique-subscription-id",
  "name": "stream-room-messages",
  "params": [
    "room-id",
    false  // Use false for all messages, or provide a timestamp for messages since that time
  ]
}
```

#### 2. Notify Room

Subscribe to room events (user typing, etc.):

```javascript
{
  "msg": "sub",
  "id": "unique-subscription-id",
  "name": "stream-notify-room",
  "params": [
    "room-id/typing",
    false
  ]
}
```

#### 3. User Presence

Subscribe to user presence updates:

```javascript
{
  "msg": "sub",
  "id": "unique-subscription-id",
  "name": "stream-notify-logged",
  "params": [
    "user-status",
    false
  ]
}
```

#### 4. Room Changes

Subscribe to room metadata changes:

```javascript
{
  "msg": "sub",
  "id": "unique-subscription-id",
  "name": "stream-notify-room",
  "params": [
    "room-id/deleteMessage",
    false
  ]
}
```

### Subscription Events

- `typing`: User typing indicators
- `deleteMessage`: Message deletion events
- `user-activity`: User activity in rooms
- `user-status`: User online/offline status
- `roles-change`: User role changes
- `updateAvatar`: Avatar updates
- `updateEmojiCustom`: Custom emoji updates

## Methods

### Send Message

```javascript
{
  "msg": "method",
  "method": "sendMessage",
  "id": "42",
  "params": [{
    "_id": "message-id",
    "rid": "room-id",
    "msg": "Hello, World!",
    "ts": { "$date": 1234567890000 }
  }]
}
```

### Update Message

```javascript
{
  "msg": "method",
  "method": "updateMessage",
  "id": "43",
  "params": [{
    "_id": "message-id",
    "rid": "room-id",
    "msg": "Updated message content"
  }]
}
```

### Delete Message

```javascript
{
  "msg": "method",
  "method": "deleteMessage",
  "id": "44",
  "params": [{
    "_id": "message-id"
  }]
}
```

### Create Channel

```javascript
{
  "msg": "method",
  "method": "createChannel",
  "id": "45",
  "params": [
    "channel-name",
    ["user1", "user2"],  // Members to add
    false  // Read-only flag
  ]
}
```

### Join Room

```javascript
{
  "msg": "method",
  "method": "joinRoom",
  "id": "46",
  "params": [
    "room-id"
  ]
}
```

### Leave Room

```javascript
{
  "msg": "method",
  "method": "leaveRoom",
  "id": "47",
  "params": [
    "room-id"
  ]
}
```

### Get Room Roles

```javascript
{
  "msg": "method",
  "method": "getRoomRoles",
  "id": "48",
  "params": [
    "room-id"
  ]
}
```

### Get Subscriptions

```javascript
{
  "msg": "method",
  "method": "subscriptions/get",
  "id": "49",
  "params": [{
    "$date": 0  // Timestamp to get subscriptions updated after
  }]
}
```

### Set User Status

```javascript
{
  "msg": "method",
  "method": "UserPresence:setDefaultStatus",
  "id": "50",
  "params": [
    "online"  // or "away", "busy", "offline"
  ]
}
```

### Load History

```javascript
{
  "msg": "method",
  "method": "loadHistory",
  "id": "51",
  "params": [
    "room-id",
    null,  // Last message timestamp (null for latest)
    50,    // Number of messages to load
    { "$date": 1234567890000 }  // Load messages before this date
  ]
}
```

## Collections

### Available Collections

1. **users**: User information
2. **rocketchat_subscription**: User's room subscriptions
3. **rocketchat_room**: Room information
4. **rocketchat_message**: Messages
5. **rocketchat_settings**: Server settings
6. **rocketchat_permissions**: Permission definitions
7. **rocketchat_roles**: Role definitions

### Collection Updates

```javascript
// Added to collection
{
  "msg": "added",
  "collection": "rocketchat_message",
  "id": "message-id",
  "fields": {
    "rid": "room-id",
    "msg": "Message content",
    "ts": { "$date": 1234567890000 },
    "u": {
      "_id": "user-id",
      "username": "username",
      "name": "User Name"
    }
  }
}

// Changed in collection
{
  "msg": "changed",
  "collection": "rocketchat_message",
  "id": "message-id",
  "fields": {
    "msg": "Updated content",
    "editedAt": { "$date": 1234567890000 },
    "editedBy": {
      "_id": "editor-user-id",
      "username": "editor"
    }
  }
}

// Removed from collection
{
  "msg": "removed",
  "collection": "rocketchat_message",
  "id": "message-id"
}
```

## Message Format

### Standard Message Object

```javascript
{
  "_id": "message-id",
  "rid": "room-id",
  "msg": "Message content",
  "ts": { "$date": 1234567890000 },
  "u": {
    "_id": "user-id",
    "username": "username",
    "name": "Display Name"
  },
  "_updatedAt": { "$date": 1234567890000 },
  "mentions": [],
  "channels": [],
  "attachments": [],
  "reactions": {},
  "starred": [],
  "pinned": false,
  "unread": true
}
```

### Message with Attachments

```javascript
{
  "_id": "message-id",
  "rid": "room-id",
  "msg": "",
  "file": {
    "_id": "file-id",
    "name": "filename.pdf",
    "type": "application/pdf"
  },
  "attachments": [{
    "title": "File Title",
    "description": "File description",
    "title_link": "/file-upload/file-id/filename.pdf",
    "title_link_download": true
  }],
  "ts": { "$date": 1234567890000 },
  "u": {
    "_id": "user-id",
    "username": "username"
  }
}
```

## Typing Indicators

### Start Typing

```javascript
{
  "msg": "method",
  "method": "stream-notify-room",
  "id": "52",
  "params": [
    "room-id/typing",
    "username",
    true  // Is typing
  ]
}
```

### Stop Typing

```javascript
{
  "msg": "method",
  "method": "stream-notify-room",
  "id": "53",
  "params": [
    "room-id/typing",
    "username",
    false  // Not typing
  ]
}
```

## Error Handling

### Error Response Format

```javascript
{
  "msg": "result",
  "id": "42",
  "error": {
    "isClientSafe": true,
    "error": "error-code",
    "reason": "Human readable error message",
    "message": "Human readable error message [error-code]",
    "errorType": "Meteor.Error"
  }
}
```

### Common Error Codes

- `error-invalid-user`: Invalid username or email
- `error-invalid-password`: Invalid password
- `error-user-not-found`: User not found
- `error-not-authorized`: Not authorized to perform action
- `error-invalid-room`: Invalid room
- `error-invalid-message`: Invalid message
- `error-message-not-found`: Message not found
- `error-invalid-subscription`: Invalid subscription

## Heartbeat (Ping/Pong)

Keep the connection alive:

```javascript
// Client sends ping
{
  "msg": "ping"
}

// Server responds with pong
{
  "msg": "pong"
}
```

## Connection Management

### Connect

```javascript
{
  "msg": "connect",
  "version": "1",
  "support": ["1"]
}
```

### Connected Response

```javascript
{
  "msg": "connected",
  "session": "session-id"
}
```

### Disconnect

```javascript
{
  "msg": "close"
}
```

## Rate Limiting

The Realtime API respects the same rate limiting rules as the REST API:

- Default: 10 calls per minute per method
- Configurable per deployment
- Rate limit information not provided in WebSocket responses
- Consider implementing client-side throttling

## Best Practices

1. **Use REST API Instead**: For new implementations, use the REST API as the Realtime API is deprecated
2. **Connection Management**: Implement reconnection logic with exponential backoff
3. **Error Handling**: Always handle error responses and connection failures
4. **Subscription Cleanup**: Unsubscribe from streams when no longer needed
5. **Message Queuing**: Queue messages during connection interruptions
6. **Authentication**: Store and reuse auth tokens, implement token refresh
7. **Heartbeat**: Send regular ping messages to keep connection alive
8. **Data Synchronization**: Handle collection updates to maintain local state

## Migration to REST API

Given the deprecation of the Realtime API, consider migrating to REST API with:

1. **Polling**: For near real-time updates, implement intelligent polling
2. **Webhooks**: Use outgoing webhooks for event notifications
3. **Server-Sent Events**: Some deployments may support SSE for real-time updates
4. **WebSocket Alternative**: Consider using the REST API with webhook integrations

## Security Considerations

1. **Always use WSS** (WebSocket Secure) in production
2. **Validate SSL certificates**
3. **Implement token rotation**
4. **Store credentials securely**
5. **Implement proper error handling** to avoid exposing sensitive information
6. **Rate limit client-side** requests to avoid overwhelming the server

## Limitations

- No built-in reconnection mechanism
- Limited error information in some responses
- No automatic message queuing during disconnections
- Collection synchronization can be memory intensive
- Deprecated and not actively maintained