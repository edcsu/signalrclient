import { useState, useEffect, useCallback } from 'react';
import signalRService from '../services/signalrService';

export const useSignalR = (hubUrl) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [joinedGroups, setJoinedGroups] = useState([]);

  // Initialize connection
  const connect = useCallback(async (url = hubUrl) => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Validate URL format
      if (!url || !url.trim()) {
        throw new Error('Hub URL is required');
      }
      
      // Basic URL validation
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid Hub URL format');
      }
      
      await signalRService.startConnection(url);
      setIsConnected(true);
      
      // Set up message listeners
      signalRService.onMessage((user, message) => {
        setMessages(prev => [...prev, { user, message, timestamp: new Date(), type: 'direct' }]);
      });

      signalRService.onGroupMessage((groupName, user, message) => {
        setMessages(prev => [...prev, { 
          user, 
          message, 
          groupName, 
          timestamp: new Date(), 
          type: 'group' 
        }]);
      });

      // Handle server events from C# hub
      signalRService.onServerConnected((connectionId) => {
        console.log('Server confirmed connection:', connectionId);
      });

      signalRService.onJoinedGroup((groupName) => {
        console.log('Server confirmed joined group:', groupName);
        // The group is already added by the joinGroup function
      });

      signalRService.onLeftGroup((groupName) => {
        console.log('Server confirmed left group:', groupName);
        // The group is already removed by the leaveGroup function
      });

      signalRService.onUserJoinedGroup((groupName, connectionId) => {
        console.log(`User ${connectionId} joined group ${groupName}`);
        setMessages(prev => [...prev, {
          user: 'System',
          message: `User joined the group`,
          groupName,
          timestamp: new Date(),
          type: 'system'
        }]);
      });

      signalRService.onUserLeftGroup((groupName, connectionId) => {
        console.log(`User ${connectionId} left group ${groupName}`);
        setMessages(prev => [...prev, {
          user: 'System',
          message: `User left the group`,
          groupName,
          timestamp: new Date(),
          type: 'system'
        }]);
      });

      signalRService.onError((errorMessage) => {
        console.error('Server error:', errorMessage);
        setConnectionError(`Server error: ${errorMessage}`);
      });

      signalRService.onConnectionId((connectionId) => {
        console.log('Connection ID received:', connectionId);
      });

      signalRService.onEcho((echoMessage) => {
        console.log('Echo received:', echoMessage);
        setMessages(prev => [...prev, {
          user: 'Echo',
          message: echoMessage,
          timestamp: new Date(),
          type: 'echo'
        }]);
      });

    } catch (error) {
      console.error('Connection failed:', error);
      let errorMessage = error.message;
      
      // Provide more specific error messages
      if (error.message.includes('Failed to start the connection')) {
        errorMessage = 'Cannot connect to SignalR hub. Please check if the server is running and the URL is correct.';
      } else if (error.message.includes('Connection closed with an error')) {
        errorMessage = 'Connection was closed by the server. This may be due to authentication issues or server configuration.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Please verify the server is running and accessible.';
      } else if (error.message.includes('certificate')) {
        errorMessage = 'SSL certificate error. For development, you may need to accept the certificate or use HTTP instead of HTTPS.';
      }
      
      setConnectionError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [hubUrl, isConnecting, isConnected]);

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      await signalRService.stopConnection();
      setIsConnected(false);
      setJoinedGroups([]);
      setMessages([]);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, []);

  // Join group
  const joinGroup = useCallback(async (groupName) => {
    try {
      await signalRService.joinGroup(groupName);
      setJoinedGroups(prev => {
        if (!prev.includes(groupName)) {
          return [...prev, groupName];
        }
        return prev;
      });
      return true;
    } catch (error) {
      setConnectionError(`Failed to join group: ${error.message}`);
      return false;
    }
  }, []);

  // Leave group
  const leaveGroup = useCallback(async (groupName) => {
    try {
      await signalRService.leaveGroup(groupName);
      setJoinedGroups(prev => prev.filter(group => group !== groupName));
      return true;
    } catch (error) {
      setConnectionError(`Failed to leave group: ${error.message}`);
      return false;
    }
  }, []);

  // Send message to group
  const sendMessageToGroup = useCallback(async (groupName, message) => {
    try {
      await signalRService.sendMessageToGroup(groupName, message);
      return true;
    } catch (error) {
      setConnectionError(`Failed to send message: ${error.message}`);
      return false;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  // Test connection by getting connection ID
  const testConnection = useCallback(async () => {
    try {
      await signalRService.connection?.invoke('GetConnectionId');
      return true;
    } catch (error) {
      setConnectionError(`Connection test failed: ${error.message}`);
      return false;
    }
  }, []);

  // Test echo functionality
  const testEcho = useCallback(async (message = 'Test message') => {
    try {
      await signalRService.connection?.invoke('Echo', message);
      return true;
    } catch (error) {
      setConnectionError(`Echo test failed: ${error.message}`);
      return false;
    }
  }, []);

  // Set up connection state listeners
  useEffect(() => {
    const handleConnection = () => setIsConnected(true);
    const handleDisconnection = (error) => {
      setIsConnected(false);
      if (error) {
        console.error('Connection lost:', error);
        let errorMessage = `Connection lost: ${error.message || 'Unknown error'}`;
        
        // Provide more specific disconnection error messages
        if (error.message && error.message.includes('Connection closed with an error')) {
          errorMessage = 'Connection was closed unexpectedly by the server. This may be due to network issues or server restart.';
        }
        
        setConnectionError(errorMessage);
      }
    };

    signalRService.onConnected(handleConnection);
    signalRService.onDisconnected(handleDisconnection);

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        signalRService.stopConnection();
      }
    };
  }, [isConnected]);

  return {
    // State
    isConnected,
    isConnecting,
    connectionError,
    messages,
    joinedGroups,
    
    // Actions
    connect,
    disconnect,
    joinGroup,
    leaveGroup,
    sendMessageToGroup,
    clearMessages,
    clearError,
    testConnection,
    testEcho,
    
    // Connection info
    connectionState: signalRService.getConnectionState()
  };
};
