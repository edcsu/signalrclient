<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# SignalR React App Instructions

This is a React application that demonstrates SignalR integration for real-time communication with group functionality.

## Project Structure
- `src/services/signalrService.js` - SignalR connection service with group management
- `src/hooks/useSignalR.js` - React hook for SignalR functionality
- `src/components/SignalRApp.jsx` - Main SignalR component with UI
- `src/components/SignalRApp.css` - Styling for the SignalR component

## Key Features
- Connect/disconnect to SignalR hub
- Join and leave groups
- Send messages to groups
- Real-time message receiving
- Connection state management
- Error handling

## SignalR Hub Methods Expected
The app expects the following methods on the SignalR hub:
- `JoinGroup(groupName)` - Join a group
- `LeaveGroup(groupName)` - Leave a group  
- `SendMessageToGroup(groupName, message)` - Send message to group

## SignalR Hub Events Expected
The app listens for these events from the hub:
- `ReceiveMessage(user, message)` - Direct message received
- `ReceiveGroupMessage(groupName, user, message)` - Group message received

## Development Guidelines
- Use functional components with hooks
- Follow React best practices
- Handle errors gracefully
- Provide user feedback for all actions
- Keep the UI responsive and accessible
