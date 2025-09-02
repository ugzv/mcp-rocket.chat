# Rocket.Chat Messaging/Chat Endpoints Documentation

## Overview

Chat endpoints handle all messaging-related operations including sending messages, managing reactions, handling threads, and message operations like editing, deleting, and searching.

## Base URL
```
https://your-rocket-chat-server.com/api/v1/chat/
```

## Authentication Required
All chat endpoints require authentication via:
- `X-Auth-Token`: Your authentication token
- `X-User-Id`: Your user ID

## Message Operations

### Send Message

#### Post Message
```http
POST /api/v1/chat.postMessage
```

**Request Body**:
```json
{
  "channel": "#general",
  "text": "Hello, world!",
  "alias": "Custom Sender Name",
  "emoji": ":ghost:",
  "avatar": "https://example.com/avatar.png",
  "attachments": [
    {
      "color": "#ff0000",
      "text": "Attachment text",
      "ts": "2023-12-01T10:00:00.000Z",
      "thumb_url": "https://example.com/thumb.png",
      "message_link": "https://rocket.chat/channel/message-id",
      "collapsed": false,
      "author_name": "Author Name",
      "author_link": "https://example.com/author",
      "author_icon": "https://example.com/author.png",
      "title": "Attachment Title",
      "title_link": "https://example.com/title",
      "title_link_download": true,
      "image_url": "https://example.com/image.png",
      "audio_url": "https://example.com/audio.mp3",
      "video_url": "https://example.com/video.mp4",
      "fields": [
        {
          "short": true,
          "title": "Field Title",
          "value": "Field Value"
        }
      ]
    }
  ],
  "parseUrls": true,
  "groupable": false,
  "customFields": {}
}
```

**Response**:
```json
{
  "success": true,
  "ts": 1701426000000,
  "channel": "#general",
  "message": {
    "_id": "messageId",
    "rid": "roomId",
    "msg": "Hello, world!",
    "ts": "2023-12-01T10:00:00.000Z",
    "u": {
      "_id": "userId",
      "username": "username",
      "name": "User Name"
    },
    "urls": [],
    "attachments": [],
    "mentions": [],
    "channels": [],
    "_updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### Get Messages

#### Get Message by ID
```http
GET /api/v1/chat.getMessage?msgId={messageId}
```

**Response**:
```json
{
  "success": true,
  "message": {
    "_id": "messageId",
    "rid": "roomId",
    "msg": "Message content",
    "ts": "2023-12-01T10:00:00.000Z",
    "u": {
      "_id": "userId",
      "username": "username",
      "name": "User Name"
    },
    "urls": [],
    "attachments": [],
    "mentions": [],
    "channels": []
  }
}
```

#### Sync Messages
```http
GET /api/v1/chat.syncMessages
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to sync messages from
- `lastUpdate` (string) - ISO date of last update to sync from
- `count` (number) - Number of messages to return (default: 50, max: 100)
- `offset` (number) - Number of messages to skip

### Update Message

#### Update Message
```http
POST /api/v1/chat.update
```

**Request Body**:
```json
{
  "roomId": "roomId",
  "msgId": "messageId", 
  "text": "Updated message content"
}
```

### Delete Message

#### Delete Message
```http
POST /api/v1/chat.delete
```

**Request Body**:
```json
{
  "roomId": "roomId",
  "msgId": "messageId",
  "asUser": false
}
```

## Message Reactions

### React to Message
```http
POST /api/v1/chat.react
```

**Request Body**:
```json
{
  "messageId": "messageId",
  "emoji": ":+1:",
  "shouldReact": true
}
```

### Get Message Reactions
```http
GET /api/v1/chat.getMessageReadReceipts?messageId={messageId}
```

## Message Actions

### Star Message
```http
POST /api/v1/chat.starMessage
```

**Request Body**:
```json
{
  "messageId": "messageId"
}
```

### Unstar Message
```http
POST /api/v1/chat.unStarMessage
```

**Request Body**:
```json
{
  "messageId": "messageId"
}
```

### Pin Message
```http
POST /api/v1/chat.pinMessage
```

**Request Body**:
```json
{
  "messageId": "messageId"
}
```

### Unpin Message
```http
POST /api/v1/chat.unPinMessage
```

**Request Body**:
```json
{
  "messageId": "messageId"
}
```

## Message Content Queries

### Get Starred Messages
```http
GET /api/v1/chat.getStarredMessages
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to get starred messages from
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip

### Get Pinned Messages
```http
GET /api/v1/chat.getPinnedMessages
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to get pinned messages from
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip

### Get Mentioned Messages
```http
GET /api/v1/chat.getMentionedMessages
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to get mentioned messages from
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip

### Get Snippeted Messages
```http
GET /api/v1/chat.getSnippetedMessages
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to get snippeted messages from
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip

### Get Snippeted Message by ID
```http
GET /api/v1/chat.getSnippetedMessageById?messageId={messageId}
```

### Get Deleted Messages
```http
GET /api/v1/chat.getDeletedMessages
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to get deleted messages from
- `since` (string) - ISO date to get messages deleted since
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip

## Thread Management

### Get Thread Messages
```http
GET /api/v1/chat.getThreadMessages
```

**Query Parameters**:
- `tmid` (string, required) - Thread message ID
- `count` (number) - Number of messages to return (default: 50)
- `offset` (number) - Number of messages to skip
- `sort` (object) - Sort options

### Get Thread List
```http
GET /api/v1/chat.getThreadsList
```

**Query Parameters**:
- `rid` (string, required) - Room ID
- `type` (string) - Thread type filter ("all", "unread", "following")
- `text` (string) - Search text in thread messages
- `count` (number) - Number of threads to return (default: 50)
- `offset` (number) - Number of threads to skip

### Sync Thread Messages
```http
GET /api/v1/chat.syncThreadMessages
```

**Query Parameters**:
- `tmid` (string, required) - Thread message ID
- `updatedSince` (string) - ISO date to sync messages since

### Sync Thread List
```http
GET /api/v1/chat.syncThreadsList
```

**Query Parameters**:
- `rid` (string, required) - Room ID
- `updatedSince` (string) - ISO date to sync threads since

### Follow Message/Thread
```http
POST /api/v1/chat.followMessage
```

**Request Body**:
```json
{
  "mid": "messageId"
}
```

### Unfollow Message/Thread
```http
POST /api/v1/chat.unfollowMessage
```

**Request Body**:
```json
{
  "mid": "messageId"
}
```

## Message Search

### Search Messages
```http
GET /api/v1/chat.search
```

**Query Parameters**:
- `roomId` (string, required) - Room ID to search in
- `searchText` (string, required) - Text to search for
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip

## Discussion Management

### Get Discussions
```http
GET /api/v1/chat.getDiscussions
```

**Query Parameters**:
- `roomId` (string, required) - Parent room ID
- `text` (string) - Search text in discussions
- `count` (number) - Number of discussions to return (default: 50)
- `offset` (number) - Number of discussions to skip

## Reporting

### Report Message
```http
POST /api/v1/chat.reportMessage
```

**Request Body**:
```json
{
  "messageId": "messageId",
  "description": "Reason for reporting"
}
```

## User Actions

### Ignore User
```http
GET /api/v1/chat.ignoreUser
```

**Query Parameters**:
- `rid` (string, required) - Room ID
- `userId` (string, required) - User ID to ignore
- `ignore` (boolean, required) - Whether to ignore (true) or unignore (false)

## Message Formatting

### Supported Markdown
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- `Code`: `\`text\``
- Code blocks: `\`\`\`code\`\`\``
- Links: `[text](url)`
- Mentions: `@username`
- Channels: `#channel-name`
- Emojis: `:emoji:`

### Message Attachments Schema

#### Text Attachment
```json
{
  "color": "#ff0000",
  "text": "Attachment text",
  "ts": "2023-12-01T10:00:00.000Z",
  "collapsed": false,
  "author_name": "Author Name",
  "author_link": "https://example.com/author",
  "author_icon": "https://example.com/author.png",
  "title": "Attachment Title",
  "title_link": "https://example.com/title",
  "fields": [
    {
      "short": true,
      "title": "Field Title", 
      "value": "Field Value"
    }
  ]
}
```

#### Image Attachment
```json
{
  "image_url": "https://example.com/image.png",
  "image_width": 1920,
  "image_height": 1080,
  "image_size": 1048576
}
```

#### File Attachment
```json
{
  "title": "file.pdf",
  "title_link": "https://example.com/file.pdf", 
  "title_link_download": true,
  "type": "file",
  "description": "PDF Document"
}
```

## Error Responses

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Message/Room not found
- `413` - Message too large
- `429` - Rate limit exceeded

### Error Response Format
```json
{
  "success": false,
  "error": "error-not-allowed",
  "errorType": "Meteor.Error"
}
```

## Rate Limiting

Chat endpoints have specific rate limits:
- Send message: 5 messages per second per user
- Other operations: 10 requests per minute per user
- Search operations: 1 request per second per user

## Required Permissions

Different chat operations require specific permissions:
- `post-readonly` - Send messages to read-only channels
- `delete-message` - Delete own messages
- `force-delete-message` - Delete any message
- `edit-message` - Edit own messages
- `edit-message-other-user` - Edit other users' messages
- `pin-message` - Pin messages
- `snippet-message` - Create message snippets

## Notes

- Messages support rich formatting including attachments, mentions, and reactions
- Thread messages are linked via the `tmid` (thread message ID) field
- Message IDs are permanent and globally unique
- Deleted messages may still be retrievable depending on server settings
- File uploads require additional multipart/form-data requests
- Real-time message updates are available via WebSocket subscriptions
- Message history is paginated and supports various filtering options