# Rocket.Chat API Error Codes Reference

## Overview

Complete reference of error codes returned by Rocket.Chat API, their meanings, and how to handle them.

## HTTP Status Codes

### Success Codes (2xx)

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded with no content to return |

### Client Error Codes (4xx)

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid request syntax or parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Valid authentication but insufficient permissions |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | HTTP method not supported for endpoint |
| 409 | Conflict | Request conflicts with current state |
| 410 | Gone | Resource no longer available |
| 422 | Unprocessable Entity | Request valid but semantically incorrect |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Error Codes (5xx)

| Code | Status | Description |
|------|--------|-------------|
| 500 | Internal Server Error | Server encountered an error |
| 502 | Bad Gateway | Invalid response from upstream server |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream server timeout |

## Rocket.Chat Specific Error Codes

### Authentication Errors

```javascript
// error-not-authorized
{
  "success": false,
  "error": "error-not-authorized",
  "errorType": "error-not-authorized",
  "details": "You must be logged in to do this."
}

// error-invalid-user
{
  "success": false,
  "error": "error-invalid-user",
  "errorType": "Meteor.Error",
  "details": "Invalid username or email"
}

// error-invalid-password
{
  "success": false,
  "error": "error-invalid-password",
  "errorType": "Meteor.Error",
  "details": "Invalid password"
}

// totp-required
{
  "success": false,
  "error": "totp-required",
  "errorType": "totp-required",
  "details": "TOTP Required",
  "message": "TOTP Required [totp-required]"
}

// totp-invalid
{
  "success": false,
  "error": "totp-invalid",
  "errorType": "totp-invalid",
  "details": "Invalid TOTP code"
}

// error-user-is-not-activated
{
  "success": false,
  "error": "error-user-is-not-activated",
  "errorType": "Meteor.Error",
  "details": "User is not activated"
}

// error-app-user-is-not-allowed-to-login
{
  "success": false,
  "error": "error-app-user-is-not-allowed-to-login",
  "errorType": "Meteor.Error",
  "details": "App users are not allowed to log in directly"
}
```

### User Management Errors

```javascript
// error-invalid-email
{
  "success": false,
  "error": "error-invalid-email",
  "errorType": "Meteor.Error",
  "details": "Invalid email address"
}

// error-email-already-exists
{
  "success": false,
  "error": "error-email-already-exists",
  "errorType": "Meteor.Error",
  "details": "Email already exists"
}

// error-username-already-exists
{
  "success": false,
  "error": "error-username-already-exists",
  "errorType": "Meteor.Error",
  "details": "Username already exists"
}

// error-could-not-save-user
{
  "success": false,
  "error": "error-could-not-save-user",
  "errorType": "Meteor.Error",
  "details": "Could not save user"
}

// error-user-not-found
{
  "success": false,
  "error": "error-user-not-found",
  "errorType": "Meteor.Error",
  "details": "User not found"
}

// error-user-registration-disabled
{
  "success": false,
  "error": "error-user-registration-disabled",
  "errorType": "Meteor.Error",
  "details": "User registration is disabled"
}

// error-user-limit-exceeded
{
  "success": false,
  "error": "error-user-limit-exceeded",
  "errorType": "Meteor.Error",
  "details": "User limit exceeded"
}
```

### Room/Channel Errors

```javascript
// error-room-not-found
{
  "success": false,
  "error": "error-room-not-found",
  "errorType": "Meteor.Error",
  "details": "Room not found"
}

// error-invalid-room
{
  "success": false,
  "error": "error-invalid-room",
  "errorType": "Meteor.Error",
  "details": "Invalid room"
}

// error-room-archived
{
  "success": false,
  "error": "error-room-archived",
  "errorType": "Meteor.Error",
  "details": "Room is archived"
}

// error-duplicate-channel-name
{
  "success": false,
  "error": "error-duplicate-channel-name",
  "errorType": "Meteor.Error",
  "details": "A channel with this name already exists"
}

// error-invalid-room-name
{
  "success": false,
  "error": "error-invalid-room-name",
  "errorType": "Meteor.Error",
  "details": "Invalid room name",
  "message": "Invalid room name: must be lowercase, alphanumeric, hyphens and underscores only"
}

// error-not-allowed
{
  "success": false,
  "error": "error-not-allowed",
  "errorType": "Meteor.Error",
  "details": "Not allowed"
}

// error-user-not-in-room
{
  "success": false,
  "error": "error-user-not-in-room",
  "errorType": "Meteor.Error",
  "details": "User is not in this room"
}

// error-user-already-in-room
{
  "success": false,
  "error": "error-user-already-in-room",
  "errorType": "Meteor.Error",
  "details": "User is already in this room"
}

// error-cant-invite-for-direct-room
{
  "success": false,
  "error": "error-cant-invite-for-direct-room",
  "errorType": "Meteor.Error",
  "details": "Cannot invite users to direct message rooms"
}

// error-max-room-members-exceeded
{
  "success": false,
  "error": "error-max-room-members-exceeded",
  "errorType": "Meteor.Error",
  "details": "Maximum room members exceeded"
}
```

### Message Errors

```javascript
// error-message-not-found
{
  "success": false,
  "error": "error-message-not-found",
  "errorType": "Meteor.Error",
  "details": "Message not found"
}

// error-invalid-message
{
  "success": false,
  "error": "error-invalid-message",
  "errorType": "Meteor.Error",
  "details": "Invalid message"
}

// error-message-too-long
{
  "success": false,
  "error": "error-message-too-long",
  "errorType": "Meteor.Error",
  "details": "Message is too long"
}

// error-message-deleting-blocked
{
  "success": false,
  "error": "error-message-deleting-blocked",
  "errorType": "Meteor.Error",
  "details": "Message deleting is blocked"
}

// error-message-editing-blocked
{
  "success": false,
  "error": "error-message-editing-blocked",
  "errorType": "Meteor.Error",
  "details": "Message editing is blocked"
}

// error-action-not-allowed
{
  "success": false,
  "error": "error-action-not-allowed",
  "errorType": "Meteor.Error",
  "details": "Action not allowed",
  "message": "Editing is not allowed after 30 minutes"
}

// error-not-allowed-to-react
{
  "success": false,
  "error": "error-not-allowed-to-react",
  "errorType": "Meteor.Error",
  "details": "Not allowed to react to messages"
}
```

### File Upload Errors

```javascript
// error-file-too-large
{
  "success": false,
  "error": "error-file-too-large",
  "errorType": "Meteor.Error",
  "details": "File is too large",
  "message": "File size exceeds maximum allowed size of 100MB"
}

// error-invalid-file-type
{
  "success": false,
  "error": "error-invalid-file-type",
  "errorType": "Meteor.Error",
  "details": "Invalid file type",
  "message": "File type is not allowed"
}

// error-file-upload-disabled
{
  "success": false,
  "error": "error-file-upload-disabled",
  "errorType": "Meteor.Error",
  "details": "File upload is disabled"
}

// error-invalid-file
{
  "success": false,
  "error": "error-invalid-file",
  "errorType": "Meteor.Error",
  "details": "Invalid file"
}

// error-file-not-found
{
  "success": false,
  "error": "error-file-not-found",
  "errorType": "Meteor.Error",
  "details": "File not found"
}
```

### Permission Errors

```javascript
// error-not-authorized
{
  "success": false,
  "error": "error-not-authorized",
  "errorType": "error-not-authorized",
  "details": "User does not have the required permission: create-c"
}

// error-no-permission
{
  "success": false,
  "error": "error-no-permission",
  "errorType": "Meteor.Error",
  "details": "No permission to perform this action"
}

// error-invalid-permission
{
  "success": false,
  "error": "error-invalid-permission",
  "errorType": "Meteor.Error",
  "details": "Invalid permission"
}

// error-invalid-role
{
  "success": false,
  "error": "error-invalid-role",
  "errorType": "Meteor.Error",
  "details": "Invalid role"
}

// error-role-not-found
{
  "success": false,
  "error": "error-role-not-found",
  "errorType": "Meteor.Error",
  "details": "Role not found"
}
```

### Integration Errors

```javascript
// error-invalid-webhook-response
{
  "success": false,
  "error": "error-invalid-webhook-response",
  "errorType": "Meteor.Error",
  "details": "Invalid response from webhook"
}

// error-integration-not-found
{
  "success": false,
  "error": "error-integration-not-found",
  "errorType": "Meteor.Error",
  "details": "Integration not found"
}

// error-invalid-integration
{
  "success": false,
  "error": "error-invalid-integration",
  "errorType": "Meteor.Error",
  "details": "Invalid integration"
}

// error-integration-disabled
{
  "success": false,
  "error": "error-integration-disabled",
  "errorType": "Meteor.Error",
  "details": "Integration is disabled"
}
```

### Rate Limiting Errors

```javascript
// error-too-many-requests
{
  "success": false,
  "error": "error-too-many-requests",
  "errorType": "too-many-requests",
  "details": "Too many requests. Please wait 51 seconds before trying again.",
  "message": "Too many requests. Please wait 51 seconds before trying again. [error-too-many-requests]"
}

// Response headers
{
  "X-RateLimit-Limit": "10",
  "X-RateLimit-Remaining": "0",
  "X-RateLimit-Reset": "1642089660000"
}
```

### Validation Errors

```javascript
// error-invalid-params
{
  "success": false,
  "error": "error-invalid-params",
  "errorType": "invalid-params",
  "details": "Invalid parameters provided"
}

// error-missing-required-field
{
  "success": false,
  "error": "error-missing-required-field",
  "errorType": "Meteor.Error",
  "details": "Missing required field: roomId"
}

// error-invalid-date
{
  "success": false,
  "error": "error-invalid-date",
  "errorType": "Meteor.Error",
  "details": "Invalid date format"
}

// error-query-too-complex
{
  "success": false,
  "error": "error-query-too-complex",
  "errorType": "Meteor.Error",
  "details": "Query is too complex"
}
```

## Error Handling Strategies

### Retry Logic Implementation

```javascript
class ApiClient {
  async requestWithRetry(url, options, maxRetries = 3) {
    const retryableErrors = [
      'error-too-many-requests',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];
    
    const retryableStatusCodes = [429, 502, 503, 504];
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          // Rate limited - check headers for wait time
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const waitTime = resetTime 
            ? parseInt(resetTime) - Date.now()
            : Math.pow(2, attempt) * 1000;
          
          if (attempt < maxRetries) {
            console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        if (retryableStatusCodes.includes(response.status) && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Server error ${response.status}. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new ApiError(data.error, response.status, data);
        }
        
        return data;
        
      } catch (error) {
        if (attempt < maxRetries) {
          if (retryableErrors.includes(error.code) || 
              retryableErrors.includes(error.error)) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`Error: ${error.message}. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        throw error;
      }
    }
  }
}
```

### Error Classification

```javascript
class ErrorHandler {
  static classify(error) {
    const categories = {
      authentication: [
        'error-not-authorized',
        'error-invalid-user',
        'error-invalid-password',
        'totp-required',
        'totp-invalid'
      ],
      permission: [
        'error-no-permission',
        'error-invalid-permission',
        'error-not-allowed'
      ],
      validation: [
        'error-invalid-params',
        'error-missing-required-field',
        'error-invalid-email',
        'error-invalid-room-name'
      ],
      notFound: [
        'error-user-not-found',
        'error-room-not-found',
        'error-message-not-found',
        'error-file-not-found'
      ],
      conflict: [
        'error-email-already-exists',
        'error-username-already-exists',
        'error-duplicate-channel-name',
        'error-user-already-in-room'
      ],
      rateLimit: [
        'error-too-many-requests'
      ],
      serverError: [
        'internal-server-error',
        'error-could-not-save-user'
      ]
    };
    
    for (const [category, codes] of Object.entries(categories)) {
      if (codes.includes(error.error || error.code)) {
        return category;
      }
    }
    
    return 'unknown';
  }
  
  static shouldRetry(error) {
    const retryableCategories = ['rateLimit', 'serverError'];
    const category = this.classify(error);
    return retryableCategories.includes(category);
  }
  
  static getUserMessage(error) {
    const messages = {
      'error-not-authorized': 'Please log in to continue',
      'error-invalid-user': 'Invalid username or email',
      'error-invalid-password': 'Incorrect password',
      'error-user-not-found': 'User not found',
      'error-room-not-found': 'Channel or room not found',
      'error-message-not-found': 'Message not found',
      'error-too-many-requests': 'Too many requests. Please wait a moment',
      'error-file-too-large': 'File is too large to upload',
      'error-invalid-file-type': 'This file type is not allowed',
      'error-email-already-exists': 'This email is already registered',
      'error-username-already-exists': 'This username is already taken'
    };
    
    return messages[error.error] || error.details || 'An error occurred';
  }
}
```

### Custom Error Class

```javascript
class RocketChatError extends Error {
  constructor(code, statusCode, details) {
    super(details?.message || details?.details || code);
    this.name = 'RocketChatError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
  
  isRetryable() {
    return ErrorHandler.shouldRetry(this);
  }
  
  getCategory() {
    return ErrorHandler.classify(this);
  }
  
  getUserMessage() {
    return ErrorHandler.getUserMessage(this);
  }
}
```

### Global Error Handler

```javascript
// Global error handler for MCP server
class GlobalErrorHandler {
  static handle(error, context = {}) {
    // Log error with context
    console.error('Error occurred:', {
      error: error.toJSON ? error.toJSON() : error,
      context,
      stack: error.stack
    });
    
    // Handle specific error types
    switch (error.code) {
      case 'error-not-authorized':
      case 'totp-required':
        // Trigger re-authentication
        this.handleAuthError(error);
        break;
        
      case 'error-too-many-requests':
        // Handle rate limiting
        this.handleRateLimit(error);
        break;
        
      case 'error-file-too-large':
      case 'error-invalid-file-type':
        // Handle file errors
        this.handleFileError(error);
        break;
        
      default:
        // Generic error handling
        this.handleGenericError(error);
    }
  }
  
  static handleAuthError(error) {
    // Clear stored credentials
    // Prompt for re-authentication
    // Emit auth-required event
  }
  
  static handleRateLimit(error) {
    // Extract wait time from error
    // Queue request for retry
    // Notify user of delay
  }
  
  static handleFileError(error) {
    // Validate file before retry
    // Suggest alternatives (compress, different format)
    // Show file requirements
  }
  
  static handleGenericError(error) {
    // Log to monitoring service
    // Show user-friendly message
    // Offer retry option if applicable
  }
}
```