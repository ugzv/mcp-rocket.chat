# Rocket.Chat MCP Server Project

## Overview

This repository contains comprehensive Rocket.Chat API documentation and will be used to create an MCP (Model Context Protocol) server for integrating with Rocket.Chat using both Node.js MCP SDK and Python implementations.

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

## Next Steps - MCP Server Implementation

### Planned MCP Server Features

1. **Connection Management**
   - Authenticate with Rocket.Chat server
   - Manage connection lifecycle
   - Handle rate limiting

2. **Message Operations**
   - Send messages to channels/users
   - Edit and delete messages
   - Thread management
   - Reactions and attachments

3. **Channel Management**
   - List channels and rooms
   - Create/delete channels
   - Manage members and permissions
   - Channel settings and metadata

4. **User Management**
   - User profiles and status
   - User search and lookup
   - Role and permission management

5. **Real-time Events**
   - Subscribe to message events
   - User presence updates
   - Room notifications

6. **Integration Features**
   - Webhook management
   - Bot functionality
   - Slash commands

### Technology Stack

- **Node.js Implementation**: Using official MCP SDK
- **Python Implementation**: Alternative implementation
- **TypeScript**: For type safety and better IDE support
- **Authentication**: Personal Access Tokens (recommended)

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

**Status**: Documentation complete, ready for MCP server implementation