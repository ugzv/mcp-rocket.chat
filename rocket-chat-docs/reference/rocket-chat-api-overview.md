# Rocket.Chat REST API Documentation Overview

## API Architecture

The Rocket.Chat REST API adheres to the principles of Representational State Transfer (REST) and utilizes conventional HTTP methods such as GET, POST, PUT, and DELETE, enabling operations on various resources.

## Base URL

All API endpoints are accessed via:
```
https://your-rocket-chat-server.com/api/v1/
```

## Authentication

### Personal Access Tokens
- Personal access tokens can be used to access the API without signing in
- Requires "create-personal-access-tokens" permission
- Authentication headers required:
  - `X-Auth-Token`: Your personal access token
  - `X-User-Id`: Your user ID

### Security Best Practices
- Always use HTTPS with valid SSL certificates in production
- Regularly expire and refresh authorization tokens
- Configure careful user permissions
- Use the login API exclusively over HTTPS during authentication

## Rate Limiting

Rate limiting is enabled by default across all endpoints to ensure server stability, prevent misuse, and facilitate equitable user access.

### Rate Limit Headers
Response headers include:
- `x-ratelimit-limit`: Number of calls allowed within a specific period
- `x-ratelimit-remaining`: Number of remaining requests within the current rate limit window
- `x-ratelimit-reset`: Time in UTC epoch milliseconds when the current rate limit window will reset

### Configuration
- Rate limiting can be modified or disabled for specific endpoints
- Configuration format: `{numRequestsAllowed: 10, intervalTimeInMS: 60000}`
- Can be disabled by setting `rateLimiterOptions: false`

## Query Parameters

### Standard Query Capabilities
- Supports MongoDB-style query operators
- Can filter and select specific fields
- Allows complex date-based queries
- Supports pagination

### Deprecated Parameters (Since v5.0.0)
- `query` parameter - deprecated to prevent malicious queries
- `fields` parameter - deprecated to prevent malicious queries
- These are disabled by default from version 7.0.0

## API Categories

### 1. Core Endpoints
- Authentication
- User Management
- Settings
- Statistics
- Miscellaneous

### 2. Messaging Endpoints
- Chat Messages
- Message Reactions
- Message Updates
- Thread Management
- Message Search

### 3. Room Management
- Channels (Public)
- Groups (Private)
- Direct Messages
- Room Settings

### 4. Integration Endpoints
- Webhooks
- OAuth Apps
- Custom Integrations

### 5. Omnichannel
- Livechat
- Customer Management
- Agent Management

## OpenAPI Integration (2025 Updates)

Rocket.Chat is actively migrating to OpenAPI specifications, which includes:
- Improved API documentation
- Enhanced type safety
- Response validation using AJV
- Swagger UI integration
- Modern chained route definition syntax

## Language Wrappers Available

Official SDKs and wrappers are available for:
- Java
- PHP
- Python
- Ruby
- Clojure
- Golang

## Deprecation Notices

### Realtime API (DDP Methods)
- DDP methods outlined in the Realtime API are deprecated
- No longer actively tested or maintained
- Behavior may be unreliable or change without notice
- REST APIs are strongly recommended for new development

### Version Support
- Current support window extends until April 30, 2025
- Based on 6-month support cycle from October 10, 2024 release

## Common HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "errorType": "error-type"
}
```

## Success Response Format

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

## Additional Resources

- Official Documentation: https://developer.rocket.chat/apidocs
- Developer Reference: https://developer.rocket.chat/reference/api/rest-api/endpoints
- OpenAPI Specifications: https://github.com/RocketChat/Rocket.Chat-Open-API
- Release Notes: https://docs.rocket.chat/docs/rocketchat-release-notes