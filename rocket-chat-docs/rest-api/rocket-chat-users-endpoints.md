# Rocket.Chat Users Endpoints Documentation

## Overview

User endpoints allow management of user accounts, profiles, and related operations in Rocket.Chat. These endpoints require appropriate permissions and authentication.

## Base URL
```
https://your-rocket-chat-server.com/api/v1/users/
```

## Authentication Required
All user endpoints require authentication via:
- `X-Auth-Token`: Your authentication token
- `X-User-Id`: Your user ID

## Common User Endpoints

### Get User Information

#### Get Current User Info
```http
GET /api/v1/me
```

**Description**: Retrieves information about the currently authenticated user.

**Response**:
```json
{
  "success": true,
  "user": {
    "_id": "userId",
    "username": "username",
    "name": "Full Name",
    "emails": [
      {
        "address": "user@example.com",
        "verified": true
      }
    ],
    "status": "online",
    "statusConnection": "online",
    "avatarUrl": "/avatar/username",
    "utcOffset": -3,
    "language": "en",
    "settings": {}
  }
}
```

#### Get User by ID
```http
GET /api/v1/users.info?userId={userId}
```

#### Get User by Username
```http
GET /api/v1/users.info?username={username}
```

**Parameters**:
- `userId` (string) - The user ID
- `username` (string) - The username

### User Management

#### List Users
```http
GET /api/v1/users.list
```

**Query Parameters**:
- `offset` (number) - Number of users to skip
- `count` (number) - Number of users to return (max 100)
- `sort` (string) - Sort field and direction (e.g., "name", "-createdAt")

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "_id": "userId",
      "username": "username",
      "name": "Full Name",
      "emails": [],
      "status": "online",
      "active": true,
      "roles": ["user"],
      "createdAt": "2023-01-01T00:00:00.000Z",
      "lastLogin": "2023-12-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "offset": 0,
  "total": 100
}
```

#### Create User
```http
POST /api/v1/users.create
```

**Required Permissions**: `create-user`

**Request Body**:
```json
{
  "name": "Full Name",
  "username": "newuser",
  "password": "password",
  "email": "user@example.com",
  "active": true,
  "roles": ["user"],
  "joinDefaultChannels": true,
  "requirePasswordChange": false,
  "sendWelcomeEmail": true,
  "verified": false,
  "customFields": {}
}
```

#### Update User
```http
POST /api/v1/users.update
```

**Required Permissions**: `edit-other-user-info`

**Request Body**:
```json
{
  "userId": "userId",
  "data": {
    "name": "Updated Name",
    "username": "updatedusername",
    "email": "newemail@example.com",
    "password": "newpassword",
    "active": true,
    "roles": ["user", "admin"],
    "customFields": {}
  }
}
```

#### Delete User
```http
POST /api/v1/users.delete
```

**Required Permissions**: `delete-user`

**Request Body**:
```json
{
  "userId": "userId"
}
```

### User Profile Operations

#### Update Own Profile
```http
POST /api/v1/users.updateOwnBasicInfo
```

**Request Body**:
```json
{
  "data": {
    "name": "New Name",
    "username": "newusername",
    "email": "newemail@example.com",
    "currentPassword": "currentpassword",
    "newPassword": "newpassword"
  }
}
```

#### Set User Avatar
```http
POST /api/v1/users.setAvatar
```

**Request Body** (Form Data):
- `avatarUrl` (string) - URL of the avatar image
- `image` (file) - Image file upload
- `userId` (string) - Target user ID (optional, defaults to current user)

#### Reset User Avatar
```http
POST /api/v1/users.resetAvatar
```

**Request Body**:
```json
{
  "userId": "userId"
}
```

### User Status and Presence

#### Set User Status
```http
POST /api/v1/users.setStatus
```

**Request Body**:
```json
{
  "status": "online|away|busy|offline",
  "message": "Custom status message"
}
```

#### Get User Status
```http
GET /api/v1/users.getStatus?userId={userId}
```

### User Preferences

#### Get User Preferences
```http
GET /api/v1/users.getPreferences
```

#### Set User Preferences
```http
POST /api/v1/users.setPreferences
```

**Request Body**:
```json
{
  "userId": "userId",
  "preferences": {
    "enableAutoAway": true,
    "idleTimeoutLimit": 300,
    "desktopNotificationDuration": 5,
    "audioNotifications": "mentions",
    "desktopNotifications": "mentions",
    "mobileNotifications": "mentions",
    "unreadAlert": true,
    "useEmojis": true,
    "convertAsciiEmoji": true,
    "autoImageLoad": true,
    "saveMobileBandwidth": false,
    "collapseMediaByDefault": false,
    "hideUsernames": false,
    "hideRoles": false,
    "hideAvatars": false,
    "roomsListExhibitionMode": "category",
    "sidebarViewMode": "medium",
    "sidebarDisplayAvatar": true,
    "sidebarShowUnread": true,
    "sidebarShowFavorites": true,
    "sendOnEnter": "normal",
    "messageViewMode": 0,
    "emailNotificationMode": "mentions",
    "roomCounterSidebar": false,
    "newRoomNotification": "door",
    "newMessageNotification": "chime",
    "muteFocusedConversations": true,
    "notificationsSoundVolume": 100
  }
}
```

### User Roles and Permissions

#### Get User Roles
```http
GET /api/v1/users.getUsersOfRole?role={roleName}
```

#### Set User Role
```http
POST /api/v1/users.update
```

**Request Body**:
```json
{
  "userId": "userId",
  "data": {
    "roles": ["user", "admin", "moderator"]
  }
}
```

### User Sessions

#### Get User Sessions
```http
GET /api/v1/users.getPersonalAccessTokens
```

#### Generate Personal Access Token
```http
POST /api/v1/users.generatePersonalAccessToken
```

**Request Body**:
```json
{
  "tokenName": "My API Token"
}
```

**Response**:
```json
{
  "success": true,
  "token": "generated-token-here"
}
```

#### Revoke Personal Access Token
```http
POST /api/v1/users.regeneratePersonalAccessToken
```

**Request Body**:
```json
{
  "tokenName": "My API Token"
}
```

### User Search and Autocomplete

#### Search Users
```http
GET /api/v1/users.autocomplete?selector={searchTerm}
```

**Query Parameters**:
- `selector` (string) - Search term to match usernames or names

#### Get Users by Username List
```http
GET /api/v1/users.list?query={"username":{"$in":["user1","user2"]}}
```

## Error Responses

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - User not found
- `409` - Conflict (username/email already exists)

### Error Response Format
```json
{
  "success": false,
  "error": "error-invalid-user",
  "errorType": "Meteor.Error"
}
```

## Rate Limiting

User endpoints are subject to rate limiting:
- Default: 10 requests per minute per IP
- Headers included in responses:
  - `x-ratelimit-limit`
  - `x-ratelimit-remaining`
  - `x-ratelimit-reset`

## Required Permissions

Different user operations require specific permissions:
- `create-user` - Create new users
- `edit-other-user-info` - Edit other users' information
- `delete-user` - Delete users
- `view-other-user-channels` - View channels of other users
- `edit-other-user-password` - Change other users' passwords
- `assign-roles` - Assign roles to users

## Notes

- User IDs are permanent and should be used for reliable user identification
- Usernames can be changed and should not be relied upon as permanent identifiers
- Email verification may be required depending on server settings
- Custom fields can be used to store additional user metadata
- Profile changes may require email verification depending on server configuration