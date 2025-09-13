# SignalR React App

A React application that demonstrates real-time communication using SignalR with group functionality.

## Features

- **Real-time Connection**: Connect/disconnect to SignalR hub
- **Group Management**: Join and leave groups dynamically
- **Group Messaging**: Send and receive messages within groups
- **Connection Status**: Visual indicators for connection state
- **Error Handling**: Graceful error handling with user feedback
- **Responsive Design**: Mobile-friendly interface

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- A SignalR server/hub running (default: `https://localhost:7000/chathub`)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Connect to Hub**: Enter your SignalR hub URL and click "Connect"
2. **Join Groups**: Once connected, enter a group name and click "Join Group"
3. **Send Messages**: Select a joined group and type messages to send to that group
4. **Manage Groups**: Leave groups by clicking the "×" button next to the group name

## Project Structure

```
src/
├── components/
│   ├── SignalRApp.jsx     # Main SignalR component
│   └── SignalRApp.css     # Component styling
├── hooks/
│   └── useSignalR.js      # React hook for SignalR functionality
├── services/
│   └── signalrService.js  # SignalR connection service
└── App.jsx                # Main application component
```

## SignalR Hub Requirements

Your SignalR hub should implement the following methods:

### Hub Methods (Client to Server)
- `JoinGroup(groupName)` - Join a group
- `LeaveGroup(groupName)` - Leave a group
- `SendMessageToGroup(groupName, message)` - Send message to group

### Hub Events (Server to Client)
- `ReceiveMessage(user, message)` - Direct message received
- `ReceiveGroupMessage(groupName, user, message)` - Group message received

## Example Hub Implementation (C#)

```csharp
public class ChatHub : Hub
{
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task SendMessageToGroup(string groupName, string message)
    {
        await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", groupName, Context.User?.Identity?.Name ?? "Anonymous", message);
    }
}
```

## Built With

- [React](https://reactjs.org/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [@microsoft/signalr](https://www.npmjs.com/package/@microsoft/signalr) - SignalR client

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

This project is open source and available under the [MIT License](LICENSE).
