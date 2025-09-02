# Rocket.Chat Integration Endpoints Documentation

## Overview

Integration endpoints enable third-party applications to interact with Rocket.Chat through webhooks, OAuth applications, and custom integrations. These endpoints facilitate automation, external service integration, and application development.

## Base URL
```
https://your-rocket-chat-server.com/api/v1/
```

## Authentication Required
All integration endpoints require authentication via:
- `X-Auth-Token`: Your authentication token
- `X-User-Id`: Your user ID

## Webhook Integrations

### Incoming Webhooks

#### Create Incoming Webhook
```http
POST /api/v1/integrations.create
```

**Required Permissions**: `manage-integrations`

**Request Body**:
```json
{
  "type": "webhook-incoming",
  "name": "My Incoming Webhook",
  "enabled": true,
  "username": "webhook-bot",
  "urls": ["https://external-service.com/webhook"],
  "scriptEnabled": false,
  "script": "",
  "channel": "#general",
  "alias": "External Service",
  "avatar": "https://example.com/avatar.png",
  "emoji": ":robot_face:",
  "token": "optional-custom-token"
}
```

**Response**:
```json
{
  "success": true,
  "integration": {
    "_id": "integrationId",
    "type": "webhook-incoming",
    "name": "My Incoming Webhook",
    "enabled": true,
    "username": "webhook-bot",
    "urls": ["https://external-service.com/webhook"],
    "token": "generated-token",
    "channel": "#general",
    "userId": "creatorId",
    "_createdAt": "2023-12-01T00:00:00.000Z",
    "_createdBy": {
      "_id": "userId",
      "username": "creator"
    },
    "_updatedAt": "2023-12-01T00:00:00.000Z"
  }
}
```

#### Use Incoming Webhook
```http
POST /hooks/{token}
```

**Request Body**:
```json
{
  "text": "Hello from external service!",
  "channel": "#general",
  "username": "External Bot",
  "icon_emoji": ":ghost:",
  "icon_url": "https://example.com/icon.png",
  "attachments": [
    {
      "color": "good",
      "text": "This is an attachment",
      "title": "Attachment Title",
      "title_link": "https://example.com",
      "image_url": "https://example.com/image.png",
      "fields": [
        {
          "title": "Priority",
          "value": "High",
          "short": true
        },
        {
          "title": "Status", 
          "value": "Open",
          "short": true
        }
      ],
      "actions": [
        {
          "type": "button",
          "text": "Open Issue",
          "url": "https://example.com/issues/123"
        }
      ]
    }
  ]
}
```

### Outgoing Webhooks

#### Create Outgoing Webhook
```http
POST /api/v1/integrations.create
```

**Request Body**:
```json
{
  "type": "webhook-outgoing",
  "name": "My Outgoing Webhook",
  "enabled": true,
  "event": "sendMessage",
  "urls": ["https://external-service.com/receive"],
  "triggerWords": ["alert", "notify"],
  "targetRoom": "#general",
  "channel": "#general",
  "username": "rocket.cat",
  "alias": "Outgoing Bot",
  "avatar": "https://example.com/avatar.png",
  "emoji": ":outbox_tray:",
  "token": "optional-custom-token",
  "retryFailedCalls": true,
  "retryCount": 5,
  "retryDelay": "powers-of-ten",
  "triggerWordAnywhere": false,
  "runOnEdits": false,
  "scriptEnabled": false,
  "script": ""
}
```

**Webhook Events**:
- `sendMessage` - Triggered when a message is sent
- `fileUploaded` - Triggered when a file is uploaded
- `roomArchived` - Triggered when a room is archived
- `roomCreated` - Triggered when a room is created
- `roomJoined` - Triggered when a user joins a room
- `roomLeft` - Triggered when a user leaves a room
- `userCreated` - Triggered when a user is created

#### Outgoing Webhook Payload
When triggered, outgoing webhooks send:

```json
{
  "token": "webhook-token",
  "bot": false,
  "trigger_word": "alert",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "user_id": "userId",
  "user_name": "username",
  "text": "alert Something important happened!",
  "channel_id": "channelId",
  "channel_name": "general",
  "team_id": "teamId",
  "team_domain": "rocket.chat",
  "message_id": "messageId",
  "robot": false,
  "is_edited": false
}
```

## OAuth Applications

### Create OAuth App
```http
POST /api/v1/oauth-apps.create
```

**Required Permissions**: `manage-oauth-apps`

**Request Body**:
```json
{
  "name": "My OAuth App",
  "redirectUri": "https://myapp.com/oauth/callback",
  "active": true
}
```

**Response**:
```json
{
  "success": true,
  "application": {
    "_id": "appId",
    "name": "My OAuth App",
    "clientId": "generated-client-id",
    "clientSecret": "generated-client-secret",
    "redirectUri": "https://myapp.com/oauth/callback",
    "active": true,
    "_createdAt": "2023-12-01T00:00:00.000Z",
    "_createdBy": {
      "_id": "userId",
      "username": "creator"
    }
  }
}
```

### Update OAuth App
```http
POST /api/v1/oauth-apps.update
```

**Request Body**:
```json
{
  "appId": "applicationId",
  "name": "Updated App Name",
  "redirectUri": "https://myapp.com/new-callback",
  "active": true
}
```

### Get OAuth Apps
```http
GET /api/v1/oauth-apps.list
```

**Response**:
```json
{
  "success": true,
  "oauthApps": [
    {
      "_id": "appId",
      "name": "My OAuth App",
      "clientId": "client-id",
      "active": true,
      "redirectUri": "https://myapp.com/oauth/callback",
      "_createdAt": "2023-12-01T00:00:00.000Z"
    }
  ]
}
```

### Delete OAuth App
```http
POST /api/v1/oauth-apps.delete
```

**Request Body**:
```json
{
  "appId": "applicationId"
}
```

### OAuth Authorization Flow

#### 1. Authorization Request
```
GET /oauth/authorize?client_id={clientId}&redirect_uri={redirectUri}&response_type=code&state={state}
```

#### 2. Token Exchange
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&client_id={clientId}&client_secret={clientSecret}&code={authCode}&redirect_uri={redirectUri}
```

**Response**:
```json
{
  "access_token": "access-token",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "scope": "read write"
}
```

#### 3. Refresh Token
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refreshToken}&client_id={clientId}&client_secret={clientSecret}
```

## Integration Management

### List Integrations
```http
GET /api/v1/integrations.list
```

**Query Parameters**:
- `offset` (number) - Number of integrations to skip
- `count` (number) - Number of integrations to return
- `sort` (object) - Sort options

**Response**:
```json
{
  "success": true,
  "integrations": [
    {
      "_id": "integrationId",
      "type": "webhook-incoming",
      "name": "My Integration",
      "enabled": true,
      "username": "integration-bot",
      "channel": "#general",
      "_createdAt": "2023-12-01T00:00:00.000Z",
      "_createdBy": {
        "_id": "userId",
        "username": "creator"
      }
    }
  ],
  "count": 1,
  "offset": 0,
  "total": 5
}
```

### Get Integration History
```http
GET /api/v1/integrations.history
```

**Query Parameters**:
- `id` (string, required) - Integration ID
- `offset` (number) - Number of history entries to skip
- `count` (number) - Number of history entries to return

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "_id": "historyId",
      "type": "webhook-incoming",
      "step": "request-received",
      "integration": {
        "_id": "integrationId",
        "name": "My Integration"
      },
      "event": "incoming-webhook",
      "data": {
        "request": {
          "url": "/hooks/token",
          "method": "POST",
          "headers": {},
          "body": "{\"text\": \"Hello\"}"
        }
      },
      "ranPrepareScript": false,
      "finished": true,
      "successful": true,
      "_createdAt": "2023-12-01T10:00:00.000Z",
      "executionTime": 150
    }
  ],
  "count": 1,
  "offset": 0,
  "total": 100
}
```

### Update Integration
```http
PUT /api/v1/integrations.update
```

**Request Body**:
```json
{
  "type": "webhook-incoming",
  "integrationId": "integrationId",
  "name": "Updated Integration Name",
  "enabled": false,
  "username": "new-bot-username",
  "urls": ["https://new-service.com/webhook"],
  "channel": "#different-channel",
  "alias": "Updated Alias",
  "avatar": "https://example.com/new-avatar.png",
  "emoji": ":new_emoji:",
  "scriptEnabled": true,
  "script": "class Script { process_incoming_request({ request }) { return { content: { text: 'Processed: ' + request.content.text } }; } }"
}
```

### Remove Integration
```http
DELETE /api/v1/integrations.remove
```

**Request Body**:
```json
{
  "type": "webhook-incoming",
  "integrationId": "integrationId"
}
```

## Slash Commands

### Create Slash Command
```http
POST /api/v1/commands.create
```

**Request Body**:
```json
{
  "command": "mycommand",
  "url": "https://external-service.com/command",
  "description": "My custom command",
  "enabled": true,
  "clientOnly": false,
  "providesPreview": false,
  "appId": "optionalAppId"
}
```

### List Slash Commands
```http
GET /api/v1/commands.list
```

### Update Slash Command
```http
POST /api/v1/commands.update
```

**Request Body**:
```json
{
  "commandId": "commandId",
  "command": "updatedcommand",
  "url": "https://external-service.com/new-endpoint",
  "description": "Updated description",
  "enabled": true
}
```

### Delete Slash Command
```http
POST /api/v1/commands.delete
```

**Request Body**:
```json
{
  "commandId": "commandId"
}
```

## Slash Command Execution

When a slash command is executed, Rocket.Chat sends:

```json
{
  "token": "command-token",
  "team_id": "teamId",
  "team_domain": "rocket.chat",
  "channel_id": "channelId",
  "channel_name": "general",
  "user_id": "userId",
  "user_name": "username",
  "command": "/mycommand",
  "text": "command arguments",
  "response_url": "https://rocket.chat/hooks/commands/response-token"
}
```

Expected response format:

```json
{
  "text": "Command executed successfully!",
  "response_type": "in_channel",
  "attachments": [
    {
      "color": "good",
      "text": "Command output",
      "title": "Result"
    }
  ]
}
```

**Response Types**:
- `ephemeral` - Only visible to the user who executed the command
- `in_channel` - Visible to all users in the channel

## Custom Scripts

### Integration Scripts

For webhook integrations, you can add custom processing scripts:

#### Incoming Webhook Script
```javascript
class Script {
  /**
   * @params {object} request
   */
  process_incoming_request({ request }) {
    // Process the incoming request
    let text = request.content.text;
    
    // Transform the message
    if (text.includes('ERROR')) {
      return {
        content: {
          text: ':rotating_light: **ERROR DETECTED** :rotating_light:\n' + text,
          attachments: [{
            color: 'danger',
            text: 'An error has occurred in the system'
          }]
        }
      };
    }
    
    return {
      content: {
        text: text,
        channel: '#alerts'
      }
    };
  }
}
```

#### Outgoing Webhook Script
```javascript
class Script {
  /**
   * @params {object} request
   */
  prepare_outgoing_request({ request }) {
    // Modify the outgoing request
    return {
      url: request.url + '?source=rocketchat',
      headers: {
        'X-Custom-Header': 'Custom Value',
        'Authorization': 'Bearer ' + request.token
      },
      data: {
        message: request.data.text,
        user: request.data.user_name,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * @params {object} request
   * @params {object} response
   */
  process_outgoing_response({ request, response }) {
    // Process the response from external service
    if (response.statusCode === 200) {
      return {
        content: {
          text: 'External service processed the message: ' + response.content.result
        }
      };
    }
    
    return {
      content: {
        text: 'Failed to process message externally'
      }
    };
  }
}
```

## Rate Limiting

Integration endpoints have specific rate limits:
- Webhook creation/updates: 10 per minute per user
- OAuth app operations: 5 per minute per user  
- Slash command operations: 10 per minute per user
- Webhook execution: 100 per minute per integration

## Security Best Practices

### Webhook Security
- Always use HTTPS for webhook URLs
- Validate webhook tokens to ensure authenticity
- Implement request signing for additional security
- Use IP whitelisting when possible
- Sanitize all incoming data

### OAuth Security
- Use secure redirect URIs (HTTPS only)
- Implement proper state parameter validation
- Store client secrets securely
- Implement token refresh logic
- Use appropriate scopes

### General Security
- Regularly rotate tokens and secrets
- Monitor integration usage and logs
- Implement proper error handling
- Use principle of least privilege

## Error Responses

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Integration not found
- `409` - Conflict (integration already exists)
- `422` - Unprocessable Entity (validation errors)

### Error Response Format
```json
{
  "success": false,
  "error": "error-integration-not-found",
  "errorType": "Meteor.Error",
  "details": {
    "integrationId": "invalid-id"
  }
}
```

## Required Permissions

Different integration operations require specific permissions:
- `manage-integrations` - Create, update, delete integrations
- `manage-own-integrations` - Manage integrations created by the user
- `manage-oauth-apps` - Create, update, delete OAuth applications
- `create-personal-access-tokens` - Generate API tokens
- `view-logs` - View integration execution logs

## Notes

- Integration tokens should be kept secure and rotated regularly
- Webhook URLs must be accessible from the Rocket.Chat server
- Custom scripts run in a sandboxed environment with limited API access
- Integration history is retained for debugging and monitoring purposes
- OAuth applications support standard OAuth 2.0 flows
- Slash commands can be triggered from any channel where the user has access
- Some integration features may require specific Rocket.Chat server configurations