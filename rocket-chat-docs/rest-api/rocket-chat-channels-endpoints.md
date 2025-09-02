# Rocket.Chat Channels/Rooms Endpoints Documentation

## Overview

Channel endpoints manage public channels, private groups, and direct messages. These endpoints allow creation, modification, and management of communication spaces in Rocket.Chat.

## Base URL
```
https://your-rocket-chat-server.com/api/v1/
```

## Authentication Required
All channel endpoints require authentication via:
- `X-Auth-Token`: Your authentication token
- `X-User-Id`: Your user ID

## Channel Types

### Public Channels (channels.*)
Public channels are accessible to all users and use the `channels.*` endpoint family.

### Private Groups (groups.*)
Private groups are invitation-only and use the `groups.*` endpoint family.

### Direct Messages (dm.* / im.*)
Direct messages between users. From version 0.50.0 onwards, use `dm.*` methods instead of `im.*`.

## Public Channels API

### Channel Information

#### Get Channel Info
```http
GET /api/v1/channels.info?roomId={roomId}
GET /api/v1/channels.info?roomName={channelName}
```

**Parameters**:
- `roomId` (string) - Channel ID
- `roomName` (string) - Channel name (without #)

**Response**:
```json
{
  "success": true,
  "channel": {
    "_id": "channelId",
    "name": "general",
    "fname": "general",
    "t": "c",
    "msgs": 1234,
    "usersCount": 50,
    "u": {
      "_id": "creatorId",
      "username": "creator"
    },
    "ts": "2023-01-01T00:00:00.000Z",
    "ro": false,
    "sysMes": true,
    "default": true,
    "description": "Channel description",
    "topic": "Channel topic",
    "announcement": "Channel announcement",
    "_updatedAt": "2023-12-01T00:00:00.000Z"
  }
}
```

#### List Channels
```http
GET /api/v1/channels.list
```

**Query Parameters**:
- `offset` (number) - Number of channels to skip
- `count` (number) - Number of channels to return (max 100)
- `sort` (string) - Sort field and direction
- `query` (object) - MongoDB query for filtering

**Response**:
```json
{
  "success": true,
  "channels": [
    {
      "_id": "channelId",
      "name": "general",
      "t": "c",
      "msgs": 1234,
      "usersCount": 50,
      "ts": "2023-01-01T00:00:00.000Z",
      "ro": false,
      "default": true
    }
  ],
  "count": 1,
  "offset": 0,
  "total": 25
}
```

### Channel Management

#### Create Channel
```http
POST /api/v1/channels.create
```

**Required Permissions**: `create-c`

**Request Body**:
```json
{
  "name": "new-channel",
  "members": ["username1", "username2"],
  "readOnly": false,
  "customFields": {
    "department": "engineering",
    "project": "alpha"
  },
  "extraData": {
    "description": "Channel description",
    "topic": "Channel topic",
    "announcement": "Welcome message"
  }
}
```

**Response**:
```json
{
  "success": true,
  "channel": {
    "_id": "newChannelId",
    "name": "new-channel",
    "t": "c",
    "msgs": 0,
    "usersCount": 3,
    "u": {
      "_id": "creatorId",
      "username": "creator"
    },
    "ts": "2023-12-01T00:00:00.000Z",
    "ro": false,
    "sysMes": true,
    "default": false
  }
}
```

#### Delete Channel
```http
POST /api/v1/channels.delete
```

**Required Permissions**: `delete-c`

**Request Body**:
```json
{
  "roomId": "channelId",
  "roomName": "channel-name"
}
```

#### Rename Channel
```http
POST /api/v1/channels.rename
```

**Required Permissions**: `edit-room`

**Request Body**:
```json
{
  "roomId": "channelId",
  "name": "new-channel-name"
}
```

#### Archive Channel
```http
POST /api/v1/channels.archive
```

**Request Body**:
```json
{
  "roomId": "channelId"
}
```

#### Unarchive Channel
```http
POST /api/v1/channels.unarchive
```

**Request Body**:
```json
{
  "roomId": "channelId"
}
```

### Channel Settings

#### Set Channel Announcement
```http
POST /api/v1/channels.setAnnouncement
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "announcement": "New announcement text"
}
```

#### Set Channel Description
```http
POST /api/v1/channels.setDescription
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "description": "New channel description"
}
```

#### Set Channel Topic
```http
POST /api/v1/channels.setTopic
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "topic": "New channel topic"
}
```

#### Set Channel Type
```http
POST /api/v1/channels.setType
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "type": "c|p"
}
```

**Types**:
- `c` - Public channel
- `p` - Private group

#### Set Read-Only Status
```http
POST /api/v1/channels.setReadOnly
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "readOnly": true
}
```

### Member Management

#### Add User to Channel
```http
POST /api/v1/channels.invite
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "userId": "userIdToAdd",
  "username": "usernameToAdd"
}
```

#### Remove User from Channel
```http
POST /api/v1/channels.kick
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "userId": "userIdToRemove",
  "username": "usernameToRemove"
}
```

#### Join Channel
```http
POST /api/v1/channels.join
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "joinCode": "optionalJoinCode"
}
```

#### Leave Channel
```http
POST /api/v1/channels.leave
```

**Request Body**:
```json
{
  "roomId": "channelId"
}
```

#### Get Channel Members
```http
GET /api/v1/channels.members
```

**Query Parameters**:
- `roomId` (string) - Channel ID
- `roomName` (string) - Channel name
- `offset` (number) - Number of members to skip
- `count` (number) - Number of members to return
- `sort` (object) - Sort options

**Response**:
```json
{
  "success": true,
  "members": [
    {
      "_id": "userId",
      "username": "username",
      "name": "Full Name",
      "status": "online"
    }
  ],
  "count": 1,
  "offset": 0,
  "total": 50
}
```

### Channel Moderation

#### Add Moderator
```http
POST /api/v1/channels.addModerator
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "userId": "userIdToPromote"
}
```

#### Remove Moderator
```http
POST /api/v1/channels.removeModerator
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "userId": "userIdToDemote"
}
```

#### Add Owner
```http
POST /api/v1/channels.addOwner
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "userId": "userIdToPromote"
}
```

#### Remove Owner
```http
POST /api/v1/channels.removeOwner
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "userId": "userIdToDemote"
}
```

### Channel History and Messages

#### Get Channel History
```http
GET /api/v1/channels.history
```

**Query Parameters**:
- `roomId` (string, required) - Channel ID
- `latest` (string) - End date (ISO format)
- `oldest` (string) - Start date (ISO format)
- `inclusive` (boolean) - Include messages at exact timestamps
- `count` (number) - Number of messages to return (default: 20)
- `offset` (number) - Number of messages to skip
- `unreads` (boolean) - Include unread message count

#### Get Channel Messages
```http
GET /api/v1/channels.messages
```

**Query Parameters**:
- `roomId` (string, required) - Channel ID
- `offset` (number) - Number of messages to skip
- `count` (number) - Number of messages to return
- `sort` (object) - Sort options

#### Clean Channel History
```http
POST /api/v1/channels.cleanHistory
```

**Request Body**:
```json
{
  "roomId": "channelId",
  "latest": "2023-12-01T00:00:00.000Z",
  "oldest": "2023-11-01T00:00:00.000Z",
  "inclusive": true,
  "excludePinned": false,
  "filesOnly": false,
  "fromUsers": ["username1", "username2"]
}
```

### Channel Files and Uploads

#### Get Channel Files
```http
GET /api/v1/channels.files
```

**Query Parameters**:
- `roomId` (string, required) - Channel ID
- `offset` (number) - Number of files to skip
- `count` (number) - Number of files to return
- `sort` (object) - Sort options
- `query` (object) - File filter query

## Private Groups API

Private groups use the same endpoints as channels but with `groups.*` instead of `channels.*`:

### Key Group Endpoints
- `GET /api/v1/groups.info` - Get group information
- `GET /api/v1/groups.list` - List groups
- `POST /api/v1/groups.create` - Create group
- `POST /api/v1/groups.delete` - Delete group
- `POST /api/v1/groups.invite` - Add user to group
- `POST /api/v1/groups.kick` - Remove user from group
- `GET /api/v1/groups.members` - Get group members
- `GET /api/v1/groups.history` - Get group history

### Group Creation
```http
POST /api/v1/groups.create
```

**Request Body**:
```json
{
  "name": "private-group",
  "members": ["username1", "username2"],
  "readOnly": false,
  "customFields": {},
  "extraData": {
    "description": "Private group description",
    "topic": "Group topic"
  }
}
```

## Direct Messages API

### DM Endpoints (Preferred v0.50.0+)
- `GET /api/v1/dm.list` - List direct message rooms
- `POST /api/v1/dm.create` - Create DM room
- `GET /api/v1/dm.history` - Get DM history
- `GET /api/v1/dm.messages` - Get DM messages

### Create DM Room
```http
POST /api/v1/dm.create
```

**Request Body**:
```json
{
  "username": "targetUsername",
  "usernames": ["user1", "user2", "user3"]
}
```

**Note**: Use either `username` for 1-on-1 DM or `usernames` for group DM.

### Legacy IM Endpoints (Deprecated)
- `GET /api/v1/im.list` - List instant message rooms (deprecated)
- `POST /api/v1/im.create` - Create IM room (deprecated)
- `GET /api/v1/im.history` - Get IM history (deprecated)

## Room Search and Filtering

### Search Channels
```http
GET /api/v1/channels.list.joined
```

**Query Parameters**:
- `offset` (number) - Number of channels to skip
- `count` (number) - Number of channels to return
- `sort` (object) - Sort options

### Get Online Users in Channel
```http
GET /api/v1/channels.online
```

**Query Parameters**:
- `roomId` (string, required) - Channel ID
- `roomName` (string) - Channel name

## Room Counter and Statistics

### Get Channel Counters
```http
GET /api/v1/channels.counters
```

**Query Parameters**:
- `roomId` (string, required) - Channel ID
- `roomName` (string) - Channel name

**Response**:
```json
{
  "success": true,
  "joined": true,
  "members": 50,
  "unreads": 5,
  "unreadsFrom": "2023-12-01T00:00:00.000Z",
  "msgs": 1234,
  "latest": "2023-12-01T10:00:00.000Z",
  "userMentions": 2
}
```

## Error Responses

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Channel not found
- `409` - Conflict (channel already exists)

### Error Response Format
```json
{
  "success": false,
  "error": "error-room-not-found",
  "errorType": "Meteor.Error"
}
```

## Rate Limiting

Channel endpoints are subject to rate limiting:
- Default: 10 requests per minute per IP
- Create operations: 5 per minute per user
- History operations: 60 per minute per user

## Required Permissions

Different channel operations require specific permissions:
- `create-c` - Create public channels
- `create-p` - Create private groups
- `delete-c` - Delete channels
- `edit-room` - Edit room settings
- `remove-user` - Remove users from rooms
- `add-user-to-joined-room` - Add users to rooms
- `mute-user` - Mute users in rooms
- `set-moderator` - Set moderators
- `set-owner` - Set owners
- `view-c-room` - View public channels
- `view-p-room` - View private groups

## Notes

- Room IDs are permanent identifiers and should be used for reliable room references
- Room names can be changed and should not be relied upon as permanent identifiers
- Private groups require explicit invitation to join
- Channel settings changes may require specific permissions
- Archived channels preserve message history but prevent new messages
- File uploads and downloads may require additional authentication
- Real-time room updates are available via WebSocket subscriptions