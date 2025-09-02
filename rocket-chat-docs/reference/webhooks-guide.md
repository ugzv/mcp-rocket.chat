# Rocket.Chat Webhooks Guide

## Overview

Rocket.Chat supports both incoming and outgoing webhooks for integrating with external services. Webhooks enable automated message posting, event notifications, and custom integrations.

## Incoming Webhooks

Incoming webhooks allow external services to post messages to Rocket.Chat channels.

### Creating an Incoming Webhook

1. Navigate to **Administration** → **Integrations**
2. Click **New Integration** → **Incoming WebHook**
3. Configure:
   - **Enabled**: Turn on the webhook
   - **Name**: Descriptive name
   - **Post to Channel**: Target channel (#channel or @username)
   - **Post as**: Username for messages
   - **Alias**: Optional display name
   - **Avatar URL**: Optional avatar image
   - **Emoji**: Alternative to avatar (e.g., :robot:)

### Webhook URL Format

```
https://your-server.rocket.chat/hooks/{webhook-id}/{webhook-token}
```

### Basic Message Posting

```javascript
// POST to webhook URL
{
  "text": "Hello from webhook!",
  "alias": "Webhook Bot",
  "emoji": ":robot:",
  "avatar": "https://example.com/avatar.png"
}

// Using curl
curl -X POST -H 'Content-Type: application/json' \
  --data '{"text":"Hello from webhook!"}' \
  https://your-server.rocket.chat/hooks/webhook-id/webhook-token
```

### Rich Message Formatting

```javascript
// Message with attachments
{
  "text": "New deployment completed",
  "attachments": [{
    "title": "Deployment #123",
    "title_link": "https://ci.example.com/builds/123",
    "text": "Successfully deployed to production",
    "color": "#00FF00",
    "fields": [{
      "title": "Environment",
      "value": "Production",
      "short": true
    }, {
      "title": "Version",
      "value": "v2.1.0",
      "short": true
    }],
    "author_name": "CI/CD Pipeline",
    "author_icon": "https://example.com/ci-icon.png",
    "image_url": "https://example.com/deployment-chart.png",
    "thumb_url": "https://example.com/thumb.png",
    "ts": "2024-01-15T10:30:00Z"
  }]
}
```

### Channel Override

```javascript
// Post to different channel than configured
{
  "channel": "#general",
  "text": "This goes to #general regardless of webhook config"
}

// Post to user (direct message)
{
  "channel": "@username",
  "text": "Direct message via webhook"
}
```

### Script Integration

Incoming webhooks can use scripts for advanced processing:

```javascript
// Webhook script (ES2015/ES6)
class Script {
  process_incoming_request({ request }) {
    // Validate request
    if (!request.content) {
      return {
        error: {
          success: false,
          message: 'No content provided'
        }
      };
    }

    // Transform the request
    const data = JSON.parse(request.content);
    
    // Custom logic
    if (data.event === 'build_success') {
      return {
        content: {
          text: `Build ${data.build_number} succeeded!`,
          attachments: [{
            color: 'good',
            title: 'Build Details',
            fields: [{
              title: 'Branch',
              value: data.branch,
              short: true
            }]
          }]
        }
      };
    }

    // Return modified content
    return {
      content: {
        text: data.text || 'Default message',
        alias: 'Custom Bot',
        emoji: ':rocket:'
      }
    };
  }
}
```

## Outgoing Webhooks

Outgoing webhooks send messages from Rocket.Chat to external services when triggered.

### Creating an Outgoing Webhook

1. Navigate to **Administration** → **Integrations**
2. Click **New Integration** → **Outgoing WebHook**
3. Configure:
   - **Event Trigger**: Message sent, File uploaded, Room archived, etc.
   - **Enabled**: Turn on the webhook
   - **Name**: Descriptive name
   - **Channel**: Channels to monitor (leave empty for all)
   - **Trigger Words**: Words that trigger the webhook
   - **URLs**: External service endpoints
   - **Token**: Optional security token

### Trigger Events

```javascript
// Available events
const events = [
  'sendMessage',        // Message sent
  'fileUploaded',      // File uploaded
  'roomArchived',      // Room archived
  'roomCreated',       // Room created
  'roomJoined',        // User joined room
  'roomLeft',          // User left room
  'userCreated',       // User created
  'userUpdated',       // User updated
  'userDeleted'        // User deleted
];
```

### Outgoing Payload Format

```javascript
// Payload sent to external service
{
  "token": "webhook-token",
  "bot": {
    "i": "integration-id",
    "name": "Integration Name"
  },
  "channel_id": "channel-id",
  "channel_name": "channel-name",
  "message_id": "message-id",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "user_id": "user-id",
  "user_name": "username",
  "text": "Message text",
  "trigger_word": "!command",
  "alias": "User Alias",
  "avatar": "avatar-url",
  "isEdited": false,
  "attachments": []
}
```

### Response Handling

External service should respond with:

```javascript
// Simple text response
{
  "text": "Response message",
  "bot": {
    "i": "integration-id"
  }
}

// Rich response with attachments
{
  "text": "Command executed",
  "attachments": [{
    "title": "Result",
    "text": "Operation completed successfully",
    "color": "#00FF00"
  }],
  "parseUrls": false
}

// Multiple messages
{
  "text": "First message",
  "bot": {
    "i": "integration-id"
  }
}
// Return array for multiple messages
[
  { "text": "Message 1" },
  { "text": "Message 2" },
  { "text": "Message 3" }
]
```

### Outgoing Script Integration

```javascript
// Outgoing webhook script
class Script {
  prepare_outgoing_request({ request }) {
    // Modify request before sending
    const match = request.data.text.match(/^!weather (.+)/);
    
    if (match) {
      const city = match[1];
      return {
        url: 'https://api.weather.com/current',
        params: {
          city: city,
          apikey: 'your-api-key'
        },
        headers: {
          'User-Agent': 'RocketChat-Weather-Bot'
        },
        method: 'GET'
      };
    }
    
    // Don't send request if no match
    return;
  }

  process_outgoing_response({ request, response }) {
    // Process external service response
    const weather = JSON.parse(response.content);
    
    return {
      content: {
        text: `Weather in ${weather.city}`,
        attachments: [{
          title: 'Current Conditions',
          fields: [{
            title: 'Temperature',
            value: `${weather.temp}°C`,
            short: true
          }, {
            title: 'Conditions',
            value: weather.description,
            short: true
          }],
          color: weather.temp > 20 ? '#FF0000' : '#0000FF'
        }]
      }
    };
  }
}
```

## Webhook Security

### Token Validation

```javascript
// Validate webhook token (incoming)
class Script {
  process_incoming_request({ request }) {
    const token = request.headers['X-Webhook-Token'];
    
    if (token !== 'expected-secret-token') {
      return {
        error: {
          success: false,
          message: 'Invalid token'
        }
      };
    }
    
    // Process valid request
    return {
      content: {
        text: 'Authenticated message'
      }
    };
  }
}
```

### HMAC Signature Verification

```javascript
// Verify webhook signature
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculatedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

// In webhook script
class Script {
  process_incoming_request({ request }) {
    const signature = request.headers['X-Signature'];
    const secret = 'webhook-secret';
    
    if (!verifyWebhookSignature(request.content, signature, secret)) {
      return {
        error: {
          success: false,
          message: 'Invalid signature'
        }
      };
    }
    
    // Process verified request
    return { content: { text: 'Verified message' } };
  }
}
```

### IP Whitelisting

```javascript
// Whitelist specific IPs
class Script {
  process_incoming_request({ request }) {
    const allowedIPs = ['192.168.1.100', '10.0.0.50'];
    const clientIP = request.headers['X-Real-IP'] || 
                    request.headers['X-Forwarded-For'];
    
    if (!allowedIPs.includes(clientIP)) {
      return {
        error: {
          success: false,
          message: 'Unauthorized IP'
        }
      };
    }
    
    // Process request from allowed IP
    return { content: { text: 'Authorized request' } };
  }
}
```

## Common Integration Examples

### GitHub Integration

```javascript
// GitHub webhook handler
class Script {
  process_incoming_request({ request }) {
    const githubEvent = request.headers['X-GitHub-Event'];
    const payload = JSON.parse(request.content);
    
    switch(githubEvent) {
      case 'push':
        return {
          content: {
            text: `New push to ${payload.repository.name}`,
            attachments: [{
              title: 'Commit',
              title_link: payload.head_commit.url,
              text: payload.head_commit.message,
              author_name: payload.head_commit.author.name,
              color: '#0366d6'
            }]
          }
        };
        
      case 'pull_request':
        return {
          content: {
            text: `PR ${payload.action}: ${payload.pull_request.title}`,
            attachments: [{
              title: payload.pull_request.title,
              title_link: payload.pull_request.html_url,
              text: payload.pull_request.body,
              color: payload.action === 'opened' ? '#28a745' : '#6f42c1'
            }]
          }
        };
        
      case 'issues':
        return {
          content: {
            text: `Issue ${payload.action}: ${payload.issue.title}`,
            attachments: [{
              title: payload.issue.title,
              title_link: payload.issue.html_url,
              text: payload.issue.body,
              color: '#d73a49'
            }]
          }
        };
        
      default:
        return {
          content: {
            text: `GitHub event: ${githubEvent}`
          }
        };
    }
  }
}
```

### Jira Integration

```javascript
// Jira webhook handler
class Script {
  process_incoming_request({ request }) {
    const payload = JSON.parse(request.content);
    const event = payload.webhookEvent;
    const issue = payload.issue;
    
    const attachment = {
      title: `${issue.key}: ${issue.fields.summary}`,
      title_link: `https://jira.example.com/browse/${issue.key}`,
      fields: [{
        title: 'Type',
        value: issue.fields.issuetype.name,
        short: true
      }, {
        title: 'Priority',
        value: issue.fields.priority.name,
        short: true
      }, {
        title: 'Status',
        value: issue.fields.status.name,
        short: true
      }, {
        title: 'Assignee',
        value: issue.fields.assignee?.displayName || 'Unassigned',
        short: true
      }]
    };
    
    switch(event) {
      case 'jira:issue_created':
        attachment.color = '#00875a';
        break;
      case 'jira:issue_updated':
        attachment.color = '#0052cc';
        break;
      case 'jira:issue_deleted':
        attachment.color = '#de350b';
        break;
    }
    
    return {
      content: {
        text: `Jira ${event.replace('jira:issue_', '')}`,
        attachments: [attachment]
      }
    };
  }
}
```

### CI/CD Pipeline Integration

```javascript
// Jenkins/GitLab CI webhook handler
class Script {
  process_incoming_request({ request }) {
    const payload = JSON.parse(request.content);
    
    const color = {
      'success': '#00FF00',
      'failed': '#FF0000',
      'pending': '#FFA500',
      'canceled': '#808080'
    }[payload.status] || '#000000';
    
    return {
      content: {
        text: `Build ${payload.status.toUpperCase()}`,
        attachments: [{
          title: `Build #${payload.build_number}`,
          title_link: payload.build_url,
          color: color,
          fields: [{
            title: 'Project',
            value: payload.project_name,
            short: true
          }, {
            title: 'Branch',
            value: payload.branch,
            short: true
          }, {
            title: 'Commit',
            value: payload.commit_id.substring(0, 7),
            short: true
          }, {
            title: 'Duration',
            value: `${payload.duration}s`,
            short: true
          }],
          footer: 'CI/CD Pipeline',
          footer_icon: 'https://example.com/ci-icon.png',
          ts: new Date(payload.timestamp).toISOString()
        }]
      }
    };
  }
}
```

### Monitoring Alert Integration

```javascript
// Monitoring system webhook handler
class Script {
  process_incoming_request({ request }) {
    const alert = JSON.parse(request.content);
    
    const severity = {
      'critical': { color: '#FF0000', emoji: ':rotating_light:' },
      'warning': { color: '#FFA500', emoji: ':warning:' },
      'info': { color: '#0000FF', emoji: ':information_source:' },
      'resolved': { color: '#00FF00', emoji: ':white_check_mark:' }
    }[alert.severity] || { color: '#808080', emoji: ':grey_question:' };
    
    return {
      content: {
        text: `${severity.emoji} **${alert.severity.toUpperCase()}**: ${alert.title}`,
        attachments: [{
          title: alert.alertname,
          text: alert.description,
          color: severity.color,
          fields: [{
            title: 'Service',
            value: alert.service,
            short: true
          }, {
            title: 'Environment',
            value: alert.environment,
            short: true
          }, {
            title: 'Metric',
            value: `${alert.metric}: ${alert.value}`,
            short: true
          }, {
            title: 'Threshold',
            value: alert.threshold,
            short: true
          }],
          actions: [{
            type: 'button',
            text: 'View Dashboard',
            url: alert.dashboard_url
          }, {
            type: 'button',
            text: 'Acknowledge',
            url: `${alert.ack_url}?token=${alert.token}`
          }],
          footer: alert.monitoring_system,
          ts: new Date(alert.timestamp).toISOString()
        }]
      }
    };
  }
}
```

## Error Handling

### Webhook Errors

```javascript
// Comprehensive error handling
class Script {
  process_incoming_request({ request }) {
    try {
      // Validate request
      if (!request.content) {
        throw new Error('Empty request body');
      }
      
      let data;
      try {
        data = JSON.parse(request.content);
      } catch (e) {
        throw new Error('Invalid JSON');
      }
      
      // Validate required fields
      if (!data.message) {
        throw new Error('Missing required field: message');
      }
      
      // Process request
      return {
        content: {
          text: data.message
        }
      };
      
    } catch (error) {
      // Log error (visible in Rocket.Chat logs)
      console.error('Webhook error:', error);
      
      // Return error response
      return {
        error: {
          success: false,
          message: error.message,
          error: 'webhook_error'
        }
      };
    }
  }
}
```

### Retry Logic

```javascript
// Implement retry for outgoing webhooks
class Script {
  async prepare_outgoing_request({ request }) {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await this.makeRequest(request);
        return response;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
      }
    }
  }
  
  async makeRequest(request) {
    // Make actual HTTP request
    // Throw error if request fails
  }
}
```

## Best Practices

1. **Use HTTPS endpoints** for webhook URLs
2. **Implement authentication** (tokens, signatures)
3. **Validate input** in webhook scripts
4. **Handle errors gracefully**
5. **Use appropriate rate limiting**
6. **Log webhook activity** for debugging
7. **Test webhooks** in development environment first
8. **Document webhook format** for team members
9. **Monitor webhook performance**
10. **Implement fallback mechanisms** for critical integrations