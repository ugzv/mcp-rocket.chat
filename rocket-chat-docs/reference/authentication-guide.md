# Rocket.Chat Authentication Guide

## Overview

Rocket.Chat provides multiple authentication methods for API access. This guide covers all available authentication options and best practices for secure API integration.

## Authentication Methods

### 1. Personal Access Tokens (Recommended)

Personal Access Tokens are the recommended method for API authentication, especially for automated scripts and integrations.

#### Creating a Personal Access Token

1. Navigate to **My Account** → **Personal Access Tokens**
2. Click **Add Token**
3. Provide a name for your token
4. Select **Ignore Two Factor Authentication** if needed
5. Click **Add**
6. **Important**: Copy the token immediately as it won't be shown again

#### Using Personal Access Tokens

```javascript
// REST API Headers
{
  "X-Auth-Token": "your-personal-access-token",
  "X-User-Id": "your-user-id"
}

// Example with curl
curl -H "X-Auth-Token: your-token" \
     -H "X-User-Id: your-user-id" \
     https://your-server.rocket.chat/api/v1/me

// Example with JavaScript
const response = await fetch('https://your-server.rocket.chat/api/v1/me', {
  headers: {
    'X-Auth-Token': 'your-token',
    'X-User-Id': 'your-user-id'
  }
});
```

#### Token Management

```javascript
// Regenerate token
POST /api/v1/users.regeneratePersonalAccessToken
{
  "tokenName": "my-token"
}

// Remove token
POST /api/v1/users.removePersonalAccessToken
{
  "tokenName": "my-token"
}

// Get token list
GET /api/v1/users.getPersonalAccessTokens
```

### 2. Login with Username and Password

Traditional login method that returns an auth token for subsequent requests.

#### Login Request

```javascript
// POST /api/v1/login
{
  "user": "username", // or email
  "password": "password"
}

// Response
{
  "status": "success",
  "data": {
    "userId": "user-id",
    "authToken": "auth-token",
    "me": {
      "_id": "user-id",
      "username": "username",
      "name": "User Name",
      "emails": [
        {
          "address": "user@example.com",
          "verified": true
        }
      ]
    }
  }
}
```

#### Using Login Tokens

```javascript
// Use returned tokens in headers
{
  "X-Auth-Token": "auth-token-from-login",
  "X-User-Id": "user-id-from-login"
}
```

#### Logout

```javascript
// POST /api/v1/logout
// Headers: X-Auth-Token, X-User-Id

// Response
{
  "status": "success",
  "data": {
    "message": "You've been logged out!"
  }
}
```

### 3. Two-Factor Authentication (2FA)

When 2FA is enabled, provide the TOTP code with login.

```javascript
// POST /api/v1/login
{
  "user": "username",
  "password": "password",
  "code": "123456" // 2FA code
}
```

### 4. OAuth 2.0

Rocket.Chat supports OAuth 2.0 for third-party application authorization.

#### OAuth Configuration

1. Create OAuth App in **Administration** → **OAuth Apps**
2. Configure redirect URI and scopes
3. Obtain client ID and secret

#### OAuth Flow

```javascript
// 1. Authorization Request
GET https://your-server.rocket.chat/oauth/authorize?
    response_type=code&
    client_id=your-client-id&
    redirect_uri=your-redirect-uri&
    scope=read write&
    state=random-state

// 2. Exchange code for token
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "authorization-code",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "redirect_uri": "your-redirect-uri"
}

// 3. Response
{
  "access_token": "access-token",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "scope": "read write"
}

// 4. Use access token
{
  "Authorization": "Bearer access-token"
}
```

#### Refresh Token

```javascript
POST /oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "your-refresh-token",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

### 5. LDAP Authentication

For LDAP-enabled instances:

```javascript
// POST /api/v1/login
{
  "ldap": true,
  "username": "ldap-username",
  "ldapPass": "ldap-password",
  "ldapOptions": {} // Optional LDAP-specific options
}
```

### 6. SAML Authentication

SAML SSO authentication flow:

```javascript
// 1. Initiate SAML login
GET /api/v1/saml/authorize

// 2. After SAML provider authentication, receive credentials
{
  "credentialToken": "saml-credential-token",
  "samlResponse": "base64-encoded-saml-response"
}

// 3. Login with SAML credentials
POST /api/v1/login
{
  "saml": true,
  "credentialToken": "saml-credential-token"
}
```

### 7. CAS Authentication

Central Authentication Service (CAS) support:

```javascript
// POST /api/v1/login
{
  "cas": {
    "credentialToken": "cas-credential-token"
  }
}
```

## API Key Authentication (Webhook Integrations)

For incoming webhooks and integrations:

```javascript
// URL includes token
POST https://your-server.rocket.chat/hooks/webhook-id/webhook-token

// Or in query parameter
POST https://your-server.rocket.chat/api/v1/chat.postMessage?token=integration-token
```

## Session Management

### Session Information

```javascript
// GET /api/v1/me
// Headers: X-Auth-Token, X-User-Id

// Response
{
  "success": true,
  "_id": "user-id",
  "username": "username",
  "emails": [...],
  "status": "online",
  "statusConnection": "online",
  "roles": ["user"],
  "active": true,
  "settings": {...}
}
```

### Session Validation

```javascript
// Validate token is still valid
GET /api/v1/me
// Returns 401 if token is invalid or expired
```

## Security Best Practices

### 1. Token Storage

```javascript
// Bad: Hardcoding tokens
const token = "abc123"; // Never do this

// Good: Environment variables
const token = process.env.ROCKET_CHAT_TOKEN;

// Good: Secure configuration
const config = require('./secure-config');
const token = config.rocketChat.token;
```

### 2. Token Rotation

```javascript
// Implement token rotation
class TokenManager {
  constructor() {
    this.tokenRefreshInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  async rotateToken() {
    const newToken = await this.generateNewToken();
    await this.revokeOldToken(this.currentToken);
    this.currentToken = newToken;
    this.scheduleNextRotation();
  }

  scheduleNextRotation() {
    setTimeout(() => this.rotateToken(), this.tokenRefreshInterval);
  }
}
```

### 3. HTTPS Only

```javascript
// Always use HTTPS in production
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://your-server.rocket.chat'
  : 'http://localhost:3000';
```

### 4. Rate Limiting

```javascript
// Implement client-side rate limiting
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async executeRequest(fn) {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.executeRequest(fn);
    }
    
    this.requests.push(now);
    return fn();
  }
}
```

## Error Handling

### Authentication Errors

```javascript
// 401 Unauthorized
{
  "status": "error",
  "message": "You must be logged in to do this."
}

// 403 Forbidden
{
  "success": false,
  "error": "User does not have the permissions required for this action"
}

// Invalid credentials
{
  "status": "error",
  "message": "Unauthorized",
  "error": "unauthorized"
}

// Token expired
{
  "status": "error",
  "message": "Token expired",
  "error": "token-expired"
}
```

### Error Handling Implementation

```javascript
class RocketChatClient {
  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'X-Auth-Token': this.authToken,
          'X-User-Id': this.userId,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 401) {
        // Token might be expired, try to refresh
        await this.refreshAuth();
        // Retry the request
        return this.makeRequest(endpoint, options);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Request failed');
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async refreshAuth() {
    // Implement token refresh logic
    if (this.refreshToken) {
      const newTokens = await this.refreshOAuthToken();
      this.authToken = newTokens.access_token;
    } else {
      // Re-authenticate with credentials
      const auth = await this.login();
      this.authToken = auth.authToken;
      this.userId = auth.userId;
    }
  }
}
```

## Multi-Factor Authentication

### TOTP Setup

```javascript
// Enable TOTP
POST /api/v1/users.2fa.enable-totp
{
  "secret": "base32-secret",
  "backupCodes": ["code1", "code2", ...],
  "totpCode": "123456"
}

// Disable TOTP
POST /api/v1/users.2fa.disable-totp
{
  "totpCode": "123456"
}
```

### Email 2FA

```javascript
// Enable email 2FA
POST /api/v1/users.2fa.enable-email

// Send code to email
POST /api/v1/users.2fa.send-email-code

// Verify with email code
POST /api/v1/login
{
  "user": "username",
  "password": "password",
  "emailCode": "123456"
}
```

## Service Account Best Practices

For automated systems and bots:

1. **Create dedicated service accounts**
   - Don't use personal accounts for automation
   - Use descriptive usernames (e.g., `bot-deployment`, `integration-crm`)

2. **Minimal permissions**
   - Grant only necessary permissions
   - Use custom roles for service accounts

3. **Token management**
   - Use Personal Access Tokens
   - Store securely in secrets management system
   - Rotate regularly

4. **Audit logging**
   - Monitor service account activity
   - Set up alerts for unusual behavior

```javascript
// Example service account setup
class ServiceAccount {
  constructor(config) {
    this.username = config.username;
    this.token = config.token;
    this.userId = config.userId;
    this.permissions = config.permissions || [];
    this.rateLimiter = new RateLimiter();
  }

  async executeAction(action, ...args) {
    // Check permissions
    if (!this.hasPermission(action)) {
      throw new Error(`Service account lacks permission: ${action}`);
    }

    // Log action
    console.log(`Service account ${this.username} executing: ${action}`);

    // Execute with rate limiting
    return this.rateLimiter.executeRequest(() => 
      this.performAction(action, ...args)
    );
  }

  hasPermission(action) {
    return this.permissions.includes(action) || 
           this.permissions.includes('*');
  }
}
```

## Testing Authentication

```javascript
// Test script for authentication
async function testAuthentication() {
  const tests = [
    {
      name: 'Personal Access Token',
      test: async () => {
        const response = await fetch(`${baseUrl}/api/v1/me`, {
          headers: {
            'X-Auth-Token': personalAccessToken,
            'X-User-Id': userId
          }
        });
        return response.ok;
      }
    },
    {
      name: 'Username/Password Login',
      test: async () => {
        const response = await fetch(`${baseUrl}/api/v1/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: username, password })
        });
        const data = await response.json();
        return data.status === 'success';
      }
    },
    {
      name: 'OAuth Token',
      test: async () => {
        const response = await fetch(`${baseUrl}/api/v1/me`, {
          headers: {
            'Authorization': `Bearer ${oauthToken}`
          }
        });
        return response.ok;
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`✓ ${test.name}: ${result ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`✗ ${test.name}: ERROR - ${error.message}`);
    }
  }
}
```