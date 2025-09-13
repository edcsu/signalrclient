import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    this.messageCallbacks = [];
  }

  // Initialize the connection
  async startConnection(hubUrl = 'https://localhost:7000/chathub') {
    try {
      this.connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          // Add connection options for better error handling
          skipNegotiation: false,
          transport: 1 | 2 | 4, // WebSockets, ServerSentEvents, LongPolling
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect([0, 2000, 10000, 30000]) // Custom retry delays
        .build();

      // Set up event handlers
      this.connection.onclose((error) => {
        this.isConnected = false;
        console.error('SignalR Connection closed:', error);
        if (error) {
          console.error('Connection close error details:', {
            message: error.message,
            type: error.constructor.name,
            stack: error.stack
          });
        }
        this.disconnectionCallbacks.forEach(callback => callback(error));
      });

      this.connection.onreconnecting((error) => {
        console.log('SignalR Reconnecting...', error);
        if (error) {
          console.error('Reconnection error details:', {
            message: error.message,
            type: error.constructor.name
          });
        }
      });

      this.connection.onreconnected((connectionId) => {
        console.log('SignalR Reconnected with connection ID:', connectionId);
        this.isConnected = true;
      });

      // Add error event handler
      this.connection.on('error', (error) => {
        console.error('SignalR Hub Error:', error);
      });

      // Start the connection
      await this.connection.start();
      this.isConnected = true;
      console.log('SignalR connected successfully');
      console.log('Connection ID:', this.connection.connectionId);
      console.log('Connection State:', this.connection.state);
      
      // Notify connection callbacks
      this.connectionCallbacks.forEach(callback => callback());
      
      return true;
    } catch (error) {
      console.error('SignalR connection failed:', error);
      console.error('Connection error details:', {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack,
        hubUrl: hubUrl
      });
      this.isConnected = false;
      throw error;
    }
  }

  // Join a group
  async joinGroup(groupName) {
    if (!this.isConnected || !this.connection) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection.invoke('JoinGroup', groupName);
      console.log(`Successfully joined group: ${groupName}`);
      return true;
    } catch (error) {
      console.error(`Failed to join group ${groupName}:`, error);
      throw error;
    }
  }

  // Leave a group
  async leaveGroup(groupName) {
    if (!this.isConnected || !this.connection) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection.invoke('LeaveGroup', groupName);
      console.log(`Successfully left group: ${groupName}`);
      return true;
    } catch (error) {
      console.error(`Failed to leave group ${groupName}:`, error);
      throw error;
    }
  }

  // Send message to group
  async sendMessageToGroup(groupName, message) {
    if (!this.isConnected || !this.connection) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection.invoke('SendMessageToGroup', groupName, message);
      console.log(`Message sent to group ${groupName}: ${message}`);
      return true;
    } catch (error) {
      console.error(`Failed to send message to group ${groupName}:`, error);
      throw error;
    }
  }

  // Listen for messages
  onMessage(callback) {
    if (this.connection) {
      this.connection.on('ReceiveMessage', callback);
      this.messageCallbacks.push(callback);
    }
  }

  // Listen for group messages
  onGroupMessage(callback) {
    if (this.connection) {
      this.connection.on('ReceiveGroupMessage', callback);
    }
  }

  // Listen for server events that the C# hub sends
  onServerConnected(callback) {
    if (this.connection) {
      this.connection.on('Connected', callback);
    }
  }

  onJoinedGroup(callback) {
    if (this.connection) {
      this.connection.on('JoinedGroup', callback);
    }
  }

  onLeftGroup(callback) {
    if (this.connection) {
      this.connection.on('LeftGroup', callback);
    }
  }

  onUserJoinedGroup(callback) {
    if (this.connection) {
      this.connection.on('UserJoinedGroup', callback);
    }
  }

  onUserLeftGroup(callback) {
    if (this.connection) {
      this.connection.on('UserLeftGroup', callback);
    }
  }

  onError(callback) {
    if (this.connection) {
      this.connection.on('Error', callback);
    }
  }

  onConnectionId(callback) {
    if (this.connection) {
      this.connection.on('ConnectionId', callback);
    }
  }

  onEcho(callback) {
    if (this.connection) {
      this.connection.on('Echo', callback);
    }
  }

  // Add connection event listeners
  onConnected(callback) {
    this.connectionCallbacks.push(callback);
  }

  onDisconnected(callback) {
    this.disconnectionCallbacks.push(callback);
  }

  // Stop the connection
  async stopConnection() {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.isConnected = false;
        console.log('SignalR connection stopped');
      } catch (error) {
        console.error('Error stopping SignalR connection:', error);
      }
    }
  }

  // Get connection state
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      connectionId: this.connection?.connectionId || null,
      state: this.connection?.state || 'Disconnected'
    };
  }

  // Test connection to hub
  async testConnection() {
    if (!this.connection || !this.isConnected) {
      return { success: false, message: 'No active connection' };
    }

    try {
      // Try to invoke a simple method (most hubs have this)
      await this.connection.invoke('GetConnectionId');
      return { success: true, message: 'Connection test successful' };
    } catch (error) {
      return { success: false, message: `Connection test failed: ${error.message}` };
    }
  }

  // Get detailed connection info for debugging
  getConnectionInfo() {
    if (!this.connection) {
      return { status: 'No connection object' };
    }

    return {
      state: this.connection.state,
      connectionId: this.connection.connectionId,
      baseUrl: this.connection.baseUrl,
      transport: this.connection.transport?.name || 'Unknown',
      features: this.connection.features || {},
      serverTimeoutInMilliseconds: this.connection.serverTimeoutInMilliseconds,
      keepAliveIntervalInMilliseconds: this.connection.keepAliveIntervalInMilliseconds
    };
  }
}

// Export a singleton instance
export const signalRService = new SignalRService();
export default signalRService;
