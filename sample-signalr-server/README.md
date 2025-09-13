# Sample SignalR Server

This is a sample C# SignalR server that works with the React SignalR client.

## Quick Start

1. **Install .NET 8 SDK** (if not already installed)
2. **Navigate to the server directory**:
   ```bash
   cd sample-signalr-server
   ```
3. **Run the server**:
   ```bash
   dotnet run
   ```

The server will start on:
- HTTP: `http://localhost:7000`
- HTTPS: `https://localhost:7001`

## Testing the Server

1. **Health Check**: Visit `http://localhost:7000/health` in your browser
2. **SignalR Hub**: The hub is available at `http://localhost:7000/chathub`

## Server Features

- ✅ Proper CORS configuration for React development
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging
- ✅ Group management (join/leave)
- ✅ Group messaging
- ✅ Connection lifecycle management
- ✅ Health check endpoints

## Hub Methods Available

### Client can call these methods:
- `JoinGroup(groupName)` - Join a chat group
- `LeaveGroup(groupName)` - Leave a chat group
- `SendMessageToGroup(groupName, message)` - Send message to group
- `SendMessage(user, message)` - Send broadcast message
- `GetConnectionId()` - Get your connection ID
- `Echo(message)` - Echo test message

### Server sends these events to clients:
- `Connected(connectionId)` - When client connects
- `JoinedGroup(groupName)` - When successfully joined group
- `LeftGroup(groupName)` - When successfully left group
- `ReceiveGroupMessage(groupName, user, message)` - Group message received
- `ReceiveMessage(user, message)` - Direct message received
- `UserJoinedGroup(groupName, connectionId)` - Someone joined group
- `UserLeftGroup(groupName, connectionId)` - Someone left group
- `Error(message)` - Error occurred
- `ConnectionId(connectionId)` - Response to GetConnectionId
- `Echo(message)` - Response to Echo

## Troubleshooting

If you get connection errors:

1. **Check if server is running**: Visit `http://localhost:7000`
2. **Check CORS**: The server is configured for common React dev ports
3. **Check logs**: The server outputs detailed logs in the console
4. **Try HTTP first**: Use `http://localhost:7000/chathub` instead of HTTPS

## Common Issues

### "Connection closed with an error"
- Usually means the server started but something in the hub methods failed
- Check the server console for error logs
- Make sure you're calling the correct hub methods

### "Failed to start connection"
- Server is not running or not accessible
- Wrong URL (check port and path)
- CORS issues (check console for CORS errors)

### "404 Not Found"
- Hub path is incorrect
- Server is not running
- Check that you're using `/chathub` as the hub path
