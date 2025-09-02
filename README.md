# Rocket.Chat MCP Server

## Overview

A Model Context Protocol (MCP) server that enables Claude to interact with Rocket.Chat servers. This implementation uses the latest TypeScript SDK and provides comprehensive tools for managing channels, messages, users, and more.

## Documentation Structure

```
rocket-chat-docs/
├── reference/
│   ├── rocket-chat-api-overview.md      # Complete API architecture and overview
│   ├── authentication-guide.md          # All authentication methods and security
│   └── webhooks-guide.md               # Incoming/outgoing webhooks guide
├── rest-api/
│   ├── rocket-chat-users-endpoints.md   # User management endpoints
│   ├── rocket-chat-chat-endpoints.md    # Messaging and chat endpoints
│   ├── rocket-chat-channels-endpoints.md # Channel/room management
│   └── rocket-chat-integration-endpoints.md # Integration endpoints
├── realtime-api/
│   └── realtime-api-overview.md        # WebSocket/DDP real-time API
└── schemas/
    └── schemas-and-models.md           # Data models and schemas
```

## Documentation Contents

### Reference Documentation
- **API Overview**: Complete REST API architecture, authentication, rate limiting, pagination
- **Authentication Guide**: Personal Access Tokens, OAuth 2.0, LDAP, SAML, 2FA
- **Webhooks Guide**: Incoming/outgoing webhooks, scripts, security, integrations

### REST API Endpoints
- **Users**: User CRUD, profiles, authentication, roles, preferences
- **Chat**: Messages, threads, reactions, attachments, search
- **Channels**: Rooms, groups, direct messages, management
- **Integrations**: Webhooks, OAuth apps, slash commands

### Real-time API
- **WebSocket/DDP**: Connection, subscriptions, methods, events
- **Note**: Deprecated in favor of REST API, but documented for reference

### Schemas and Models
- **Data Models**: User, Room, Message, Subscription, Integration models
- **TypeScript Interfaces**: Complete type definitions
- **Validation Rules**: Field requirements and constraints

## Key Features Documented

- ✅ Complete REST API endpoints with examples
- ✅ Authentication methods (Personal Access Tokens, OAuth, LDAP, SAML)
- ✅ Request/response formats with JSON examples
- ✅ Error handling and status codes
- ✅ Rate limiting and pagination
- ✅ Webhook integrations (GitHub, Jira, CI/CD, monitoring)
- ✅ Security best practices
- ✅ TypeScript interfaces for all data models
- ✅ Real-time API (WebSocket/DDP) - deprecated but documented

## Installation

### Prerequisites
- Node.js 18.x or higher
- Rocket.Chat server with API access
- Personal Access Token from Rocket.Chat

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mcp-rocket.chat.git
cd mcp-rocket.chat
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Rocket.Chat credentials
```

4. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file with:
```env
ROCKET_CHAT_URL=https://your-instance.rocket.chat
ROCKET_CHAT_USER_ID=your_user_id
ROCKET_CHAT_AUTH_TOKEN=your_auth_token
```

### Getting Credentials

1. **User ID and Auth Token**:
   - Go to your Rocket.Chat instance
   - Navigate to Profile → My Account → Personal Access Tokens
   - Generate a new token and copy both User ID and Token

### Claude Desktop Configuration

Add to your Claude Desktop config (`claude_config.json`):
```json
{
  "mcpServers": {
    "rocket-chat": {
      "command": "node",
      "args": ["path/to/mcp-rocket.chat/dist/index.js"],
      "env": {
        "ROCKET_CHAT_URL": "https://your-instance.rocket.chat",
        "ROCKET_CHAT_USER_ID": "your_user_id",
        "ROCKET_CHAT_AUTH_TOKEN": "your_auth_token"
      }
    }
  }
}
```

## Available Tools

### Message Operations
- `send_message` - Send messages to channels or users
- `get_messages` - Retrieve messages from a room
- `search_messages` - Search for messages across rooms

### Channel Management
- `list_channels` - List available channels (public/private/direct)
- `create_channel` - Create new channels
- `join_channel` - Join a channel
- `leave_channel` - Leave a channel
- `set_topic` - Set channel topic
- `get_room_info` - Get detailed room information

### User Management
- `get_user_info` - Get user profile information

### Utilities
- `test_connection` - Test connection to Rocket.Chat server

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Technology Stack

- **TypeScript**: Type-safe implementation
- **@modelcontextprotocol/sdk**: Latest MCP SDK (v1.17.4)
- **Zod**: Runtime type validation for tool inputs
- **Node.js**: Runtime environment

## API Version Compatibility

- Documentation based on Rocket.Chat REST API v1
- Includes 2025 updates and OpenAPI integration notes
- Real-time API (DDP) documented but deprecated

## Security Considerations

- Always use HTTPS in production
- Store tokens securely (environment variables, secrets management)
- Implement proper error handling
- Use rate limiting to prevent API abuse
- Validate all inputs and outputs

## Resources

- [Rocket.Chat Developer Portal](https://developer.rocket.chat/)
- [REST API Reference](https://developer.rocket.chat/reference/api/rest-api)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)

## License

This documentation is compiled from public Rocket.Chat API documentation for the purpose of creating an MCP server integration.

## Contributing

When implementing the MCP server:
1. Follow the documented API schemas
2. Implement proper error handling
3. Add comprehensive tests
4. Document any deviations from standard API
5. Keep security as top priority

---

## Status

✅ **MCP Server Implementation Complete**
- Latest MCP SDK integrated
- All core Rocket.Chat operations supported
- Type-safe implementation with Zod validation
- Comprehensive error handling
- Ready for production use

## Support

For issues or questions:
- Open an issue on GitHub
- Check the documentation in `/rocket-chat-docs`
- Refer to [Rocket.Chat API docs](https://developer.rocket.chat/reference/api/rest-api)