# Self-Hosted Rocket.Chat Configuration Guide

## Overview

This guide covers specific configurations and considerations for integrating with a self-hosted Rocket.Chat instance via MCP server.

## Server Configuration

### Base URL Configuration

```javascript
// Configuration for self-hosted instance
const config = {
  // Your self-hosted server URL
  baseUrl: 'https://your-domain.com',  // No trailing slash
  
  // Alternative ports if not using standard
  wsUrl: 'wss://your-domain.com/websocket',
  
  // API path (usually doesn't change)
  apiPath: '/api/v1',
  
  // File upload endpoint
  uploadUrl: '/api/v1/rooms.upload',
  
  // Hooks path for webhooks
  hooksPath: '/hooks'
};
```

### SSL/TLS Configuration

```javascript
// For self-signed certificates (development only)
const https = require('https');
const agent = new https.Agent({
  rejectUnauthorized: false  // Only for development!
});

// Production with custom CA
const agent = new https.Agent({
  ca: fs.readFileSync('/path/to/ca-cert.pem'),
  cert: fs.readFileSync('/path/to/client-cert.pem'),
  key: fs.readFileSync('/path/to/client-key.pem')
});

// Using with fetch
fetch(`${config.baseUrl}/api/v1/me`, {
  headers: {
    'X-Auth-Token': token,
    'X-User-Id': userId
  },
  agent: agent  // Custom agent for self-signed certs
});
```

### Proxy Configuration

```javascript
// If behind corporate proxy
const HttpsProxyAgent = require('https-proxy-agent');

const proxyAgent = new HttpsProxyAgent({
  host: 'proxy.company.com',
  port: 8080,
  auth: 'username:password'
});

// Use with API calls
fetch(url, {
  agent: proxyAgent,
  headers: headers
});
```

## Authentication Setup

### Personal Access Token Generation

For self-hosted instances, ensure these settings are enabled:

1. **Admin Panel** → **Accounts** → **Two Factor Authentication**
   - Enable "Allow users to create personal access tokens"
   - Set token expiration if needed

2. **Generate Token via API** (if UI is disabled):

```javascript
// POST /api/v1/users.generatePersonalAccessToken
{
  "tokenName": "mcp-server-token"
}

// Response
{
  "token": "9HqLlyZOugoStsXCUfD_0YdwnNnunAJF8V47U3QHXSq",
  "success": true
}
```

### Service Account Creation

```bash
# Create dedicated service account for MCP
POST /api/v1/users.create
{
  "email": "mcp-bot@your-domain.com",
  "name": "MCP Service Bot",
  "password": "secure-password-here",
  "username": "mcp-bot",
  "roles": ["bot"],
  "joinDefaultChannels": false,
  "requirePasswordChange": false,
  "sendWelcomeEmail": false,
  "verified": true
}
```

## Server Settings to Check

### API Settings

```javascript
// GET /api/v1/settings/public
// Important settings to verify:

{
  "API_Enable_Rate_Limiter": true,           // Rate limiting enabled
  "API_Enable_Rate_Limiter_Dev": false,      // Dev mode rate limiting
  "API_Default_Count": 50,                   // Default pagination count
  "API_Upper_Count_Limit": 100,              // Max items per page
  "API_Allow_Infinite_Count": false,         // Infinite pagination
  "API_Enable_Direct_Message_History_EndPoint": true,
  "API_Enable_Shields": true,
  "API_Shield_Types": "*",
  "API_CORS_Origin": "*",                    // CORS settings
  "Accounts_AllowPasswordChange": true,
  "Accounts_AllowUserProfileChange": true,
  "Accounts_AllowUsernameChange": true,
  "FileUpload_Enabled": true,
  "FileUpload_MaxFileSize": 104857600,       // 100MB
  "FileUpload_MediaTypeWhiteList": "image/*,audio/*,video/*,application/pdf",
  "Message_MaxAllowedSize": 5000,
  "Message_Read_Receipt_Enabled": true,
  "Message_Read_Receipt_Store_Users": false
}
```

### Rate Limiting Configuration

```javascript
// Admin Panel → General → REST API → Rate Limiter
{
  "API_Enable_Rate_Limiter": true,
  "API_Enable_Rate_Limiter_Limit_Calls_Default": 10,
  "API_Enable_Rate_Limiter_Limit_Time_Default": 60000,
  
  // Per-endpoint overrides
  "Rate_Limiter_Limit_RegisterUser": 1,
  "Rate_Limiter_Limit_SendMessage": 5,
  "Rate_Limiter_Limit_LoadHistory": 5,
  "Rate_Limiter_Limit_SearchMessages": 5
}
```

## File Storage Configuration

### Local File Storage

```javascript
// Default local storage paths
{
  "FileUpload_Storage_Type": "GridFS",  // or "FileSystem", "AmazonS3"
  "FileUpload_FileSystemPath": "/var/uploads",
  "FileUpload_ProtectFiles": true,
  "FileUpload_KeepFileType": true
}
```

### S3-Compatible Storage

```javascript
// For S3 or MinIO
{
  "FileUpload_Storage_Type": "AmazonS3",
  "FileUpload_S3_Bucket": "rocketchat-uploads",
  "FileUpload_S3_Region": "us-east-1",
  "FileUpload_S3_Endpoint": "s3.amazonaws.com",  // or MinIO endpoint
  "FileUpload_S3_AccessKey": "access-key",
  "FileUpload_S3_SecretKey": "secret-key",
  "FileUpload_S3_SignatureVersion": "v4",
  "FileUpload_S3_ForcePathStyle": true  // For MinIO
}
```

## Database Considerations

### MongoDB Connection

```javascript
// Typical MongoDB connection string
MONGO_URL=mongodb://username:password@localhost:27017/rocketchat?replicaSet=rs01

// With authentication
MONGO_URL=mongodb://username:password@host1:27017,host2:27017/rocketchat?authSource=admin&replicaSet=rs01

// MongoDB Atlas
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/rocketchat?retryWrites=true&w=majority
```

### Database Indexes

Ensure these indexes exist for optimal performance:

```javascript
// Check indexes via MongoDB shell
db.rocketchat_message.getIndexes()
db.rocketchat_room.getIndexes()
db.rocketchat_subscription.getIndexes()
db.users.getIndexes()

// Critical indexes
{
  "rid": 1,
  "ts": -1
}  // Messages by room and timestamp

{
  "u._id": 1,
  "open": 1
}  // User subscriptions
```

## WebSocket Configuration

### Connection Settings

```javascript
// WebSocket connection for real-time features
const WebSocket = require('ws');

const ws = new WebSocket('wss://your-domain.com/websocket', {
  headers: {
    'Host': 'your-domain.com',
    'Origin': 'https://your-domain.com'
  },
  // For self-signed certificates
  rejectUnauthorized: false,
  
  // Timeouts
  handshakeTimeout: 10000,
  
  // Reconnection settings
  perMessageDeflate: false,
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.3
});
```

### Keep-Alive Configuration

```javascript
// Ping/Pong to keep connection alive
let pingInterval;

ws.on('open', () => {
  // Send ping every 30 seconds
  pingInterval = setInterval(() => {
    ws.send(JSON.stringify({ msg: 'ping' }));
  }, 30000);
});

ws.on('close', () => {
  clearInterval(pingInterval);
});
```

## Performance Tuning

### API Call Optimization

```javascript
// Batch operations when possible
class BatchProcessor {
  constructor(maxBatchSize = 50, maxWaitTime = 1000) {
    this.queue = [];
    this.maxBatchSize = maxBatchSize;
    this.maxWaitTime = maxWaitTime;
    this.timer = null;
  }
  
  add(item) {
    this.queue.push(item);
    
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxWaitTime);
    }
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.maxBatchSize);
    clearTimeout(this.timer);
    this.timer = null;
    
    // Process batch
    await this.processBatch(batch);
  }
}
```

### Caching Strategy

```javascript
// Implement caching for frequently accessed data
class CacheManager {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  // Cache room info, user data, settings
  async getRoomInfo(roomId) {
    const cached = this.get(`room:${roomId}`);
    if (cached) return cached;
    
    const room = await api.getRoomInfo(roomId);
    this.set(`room:${roomId}`, room);
    return room;
  }
}
```

## Monitoring and Logging

### Health Check Endpoint

```javascript
// Monitor server health
async function checkHealth() {
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/info`, {
      headers: {
        'X-Auth-Token': token,
        'X-User-Id': userId
      }
    });
    
    const data = await response.json();
    return {
      healthy: response.ok,
      version: data.info?.version,
      commit: data.info?.commit,
      build: data.info?.build
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

// Periodic health checks
setInterval(async () => {
  const health = await checkHealth();
  if (!health.healthy) {
    console.error('Server unhealthy:', health.error);
    // Trigger alerts
  }
}, 60000); // Every minute
```

### Logging Configuration

```javascript
// Structured logging for MCP server
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-rocketchat' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Log API calls
function logApiCall(method, endpoint, duration, status) {
  logger.info('API Call', {
    method,
    endpoint,
    duration,
    status,
    timestamp: new Date().toISOString()
  });
}
```

## Docker Deployment

### Docker Compose Configuration

```yaml
# docker-compose.yml for self-hosted Rocket.Chat
version: '3.7'

services:
  rocketchat:
    image: rocket.chat:latest
    environment:
      - PORT=3000
      - ROOT_URL=https://your-domain.com
      - MONGO_URL=mongodb://mongo:27017/rocketchat
      - MONGO_OPLOG_URL=mongodb://mongo:27017/local
      - MAIL_URL=smtp://smtp.email
    depends_on:
      - mongo
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./custom-sounds:/app/custom-sounds

  mongo:
    image: mongo:4.4
    restart: always
    volumes:
      - ./data/db:/data/db
      - ./data/dump:/dump
    command: mongod --replSet rs0

  mcp-server:
    build: ./mcp-server
    environment:
      - ROCKET_URL=http://rocketchat:3000
      - ROCKET_USER_ID=${ROCKET_USER_ID}
      - ROCKET_AUTH_TOKEN=${ROCKET_AUTH_TOKEN}
    depends_on:
      - rocketchat
```

## Environment Variables

### Required Environment Variables

```bash
# .env file for MCP server
# Server Configuration
ROCKET_CHAT_URL=https://your-domain.com
ROCKET_CHAT_ADMIN_USER=admin
ROCKET_CHAT_ADMIN_PASS=admin-password

# Authentication
ROCKET_CHAT_USER_ID=your-user-id
ROCKET_CHAT_AUTH_TOKEN=your-auth-token

# Optional: OAuth
ROCKET_CHAT_OAUTH_CLIENT_ID=oauth-client-id
ROCKET_CHAT_OAUTH_CLIENT_SECRET=oauth-client-secret

# WebSocket
ROCKET_CHAT_WEBSOCKET_URL=wss://your-domain.com/websocket

# File Storage
ROCKET_CHAT_FILE_UPLOAD_MAX_SIZE=104857600
ROCKET_CHAT_FILE_UPLOAD_ENABLED=true

# Performance
ROCKET_CHAT_API_RATE_LIMIT=10
ROCKET_CHAT_API_RATE_WINDOW=60000
ROCKET_CHAT_MAX_CONNECTIONS=5
ROCKET_CHAT_CONNECTION_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# SSL/TLS (for self-signed certs)
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only!
SSL_CA_PATH=/path/to/ca.pem
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Proxy (if needed)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check firewall rules
   - Verify server is running
   - Check SSL/TLS configuration

2. **Authentication Failed**
   - Verify token hasn't expired
   - Check user permissions
   - Ensure 2FA is handled correctly

3. **Rate Limiting**
   - Implement exponential backoff
   - Cache frequently accessed data
   - Use batch operations

4. **WebSocket Disconnections**
   - Implement reconnection logic
   - Check proxy/load balancer timeouts
   - Enable keep-alive pings

5. **File Upload Issues**
   - Check file size limits
   - Verify storage permissions
   - Check allowed file types

### Debug Mode

```javascript
// Enable debug logging
if (process.env.DEBUG) {
  // Log all API requests
  axios.interceptors.request.use(request => {
    console.log('Starting Request:', request);
    return request;
  });
  
  // Log all API responses
  axios.interceptors.response.use(response => {
    console.log('Response:', response);
    return response;
  });
}
```