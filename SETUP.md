# Rocket.Chat MCP Server Setup Guide

This MCP server allows Claude.ai to interact with your self-hosted Rocket.Chat instance at myteam.chat.

## Prerequisites

1. Node.js 18+ installed
2. Access to your Rocket.Chat instance (myteam.chat)
3. Personal Access Token from Rocket.Chat

## Step 1: Get Rocket.Chat Credentials

1. Log into your Rocket.Chat instance at https://myteam.chat
2. Go to **My Account** (click your avatar → My Account)
3. Navigate to **Personal Access Tokens**
4. Click **Add Token**
5. Give it a name (e.g., "MCP Server")
6. Click **Add** and save the generated token and user ID

## Step 2: Install Dependencies

Open a terminal in this directory and run:

```bash
npm install
```

## Step 3: Configure Environment

1. Create a `.env` file by copying the example:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` file and add your credentials:
   ```
   ROCKET_CHAT_URL=https://myteam.chat
   ROCKET_CHAT_USER_ID=your-user-id-here
   ROCKET_CHAT_AUTH_TOKEN=your-personal-access-token-here
   ```

## Step 4: Build the Server

```bash
npm run build
```

## Step 5: Test the Server

Run the server manually to test:

```bash
npm start
```

You should see: `Rocket.Chat MCP server running on stdio`

Press Ctrl+C to stop.

## Step 6: Configure Claude Desktop

1. Find your Claude Desktop configuration file:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Edit the configuration file and add the Rocket.Chat server:

```json
{
  "mcpServers": {
    "rocket-chat": {
      "command": "node",
      "args": ["C:\\Projects\\dev\\mcp-rocket.chat\\dist\\index.js"],
      "env": {
        "ROCKET_CHAT_URL": "https://myteam.chat",
        "ROCKET_CHAT_USER_ID": "your-user-id-here",
        "ROCKET_CHAT_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Important**: Adjust the path in `args` to match your actual installation path.

3. Restart Claude Desktop for changes to take effect

## Step 7: Verify Connection

In Claude.ai, you should now be able to use Rocket.Chat tools. Try:

1. "List my Rocket.Chat channels"
2. "Send a test message to #general"
3. "Search for messages containing 'meeting'"

## Available Tools

Once connected, Claude can:

- **send_message**: Send messages to channels or users
- **list_channels**: List public, private, or direct channels
- **get_messages**: Retrieve recent messages from a channel
- **search_messages**: Search for messages across channels
- **create_channel**: Create new channels
- **get_user_info**: Get information about users
- **get_room_info**: Get channel/room details
- **join_channel**: Join a channel
- **leave_channel**: Leave a channel
- **set_topic**: Set channel topic

## Troubleshooting

### Connection Issues

1. Verify your credentials in `.env` file
2. Check that your Rocket.Chat instance is accessible
3. Ensure the Personal Access Token has not expired
4. Check Claude Desktop logs:
   - Windows: `%APPDATA%\Claude\logs`
   - macOS: `~/Library/Logs/Claude`

### Build Issues

If TypeScript compilation fails:
```bash
npm run build
```

### Permission Issues

Ensure your Rocket.Chat user has appropriate permissions for the operations you're trying to perform.

### SSL Certificate Issues

If using self-signed certificates, you may need to set:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Warning**: Only use this in development/testing environments.

## Development

For development with hot reload:
```bash
npm run dev
```

## Security Notes

1. **Never commit your `.env` file** - it contains sensitive credentials
2. Use environment variables or secure credential storage in production
3. Regularly rotate your Personal Access Tokens
4. Limit permissions to only what's necessary

## Support

For issues specific to this MCP server, check the documentation in this repository.
For Rocket.Chat API documentation, visit: https://developer.rocket.chat/