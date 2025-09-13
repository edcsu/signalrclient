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
      setConnectionError(error.message);
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
        setConnectionError(`Connection lost: ${error.message || 'Unknown error'}`);
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
