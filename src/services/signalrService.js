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
        .withUrl(hubUrl)
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      // Set up event handlers
      this.connection.onclose((error) => {
        this.isConnected = false;
        console.log('Connection closed:', error);
        this.disconnectionCallbacks.forEach(callback => callback(error));
      });

      this.connection.onreconnecting((error) => {
        console.log('Reconnecting...', error);
      });

      this.connection.onreconnected((connectionId) => {
        console.log('Reconnected with connection ID:', connectionId);
        this.isConnected = true;
      });

      // Start the connection
      await this.connection.start();
      this.isConnected = true;
      console.log('SignalR connected successfully');
      
      // Notify connection callbacks
      this.connectionCallbacks.forEach(callback => callback());
      
      return true;
    } catch (error) {
      console.error('SignalR connection failed:', error);
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
}

// Export a singleton instance
export const signalRService = new SignalRService();
export default signalRService;
