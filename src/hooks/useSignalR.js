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
    
    // Connection info
    connectionState: signalRService.getConnectionState()
  };
};
