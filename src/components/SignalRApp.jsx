import React, { useState } from 'react';
import ConnectionDiagnostics from './ConnectionDiagnostics';
import BackendHealthCheck from './BackendHealthCheck';
import './SignalRApp.css';

const SignalRApp = ({ 
  isConnected, 
  isConnecting, 
  connectionError, 
  messages, 
  joinedGroups,
  connect, 
  disconnect, 
  joinGroup, 
  leaveGroup, 
  sendMessageToGroup,
  clearMessages,
  clearError,
  connectionState
}) => {
  const [hubUrl, setHubUrl] = useState('https://localhost:7000/chathub');
  const [groupName, setGroupName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  const handleConnect = async () => {
    await connect(hubUrl);
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (groupName.trim()) {
      const success = await joinGroup(groupName.trim());
      if (success) {
        setGroupName('');
        setSelectedGroup(groupName.trim());
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (messageText.trim() && selectedGroup) {
      const success = await sendMessageToGroup(selectedGroup, messageText.trim());
      if (success) {
        setMessageText('');
      }
    }
  };

  const handleLeaveGroup = async (group) => {
    await leaveGroup(group);
    if (selectedGroup === group) {
      setSelectedGroup('');
    }
  };

  return (
    <div className="signalr-app">
      <div className="header">
        <h1>SignalR React App</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {connectionError && (
        <div className="error-message">
          <span>{connectionError}</span>
          <button onClick={clearError} className="clear-btn">×</button>
        </div>
      )}

      {/* Connection Section */}
      <div className="section">
        <h2>Connection</h2>
        <div className="connection-controls">
          <div className="input-group">
            <label htmlFor="hubUrl">Hub URL:</label>
            <input
              id="hubUrl"
              type="text"
              value={hubUrl}
              onChange={(e) => setHubUrl(e.target.value)}
              disabled={isConnected || isConnecting}
              placeholder="https://localhost:7000/chathub"
            />
          </div>
          <div className="button-group">
            {!isConnected ? (
              <button 
                onClick={handleConnect} 
                disabled={isConnecting || !hubUrl.trim()}
                className="connect-btn"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            ) : (
              <button onClick={disconnect} className="disconnect-btn">
                Disconnect
              </button>
            )}
          </div>
        </div>
        
        {/* Connection Diagnostics */}
        {(connectionError || !isConnected) && (
          <>
            <ConnectionDiagnostics 
              hubUrl={hubUrl} 
              connectionState={connectionState}
            />
            <BackendHealthCheck hubUrl={hubUrl} />
          </>
        )}
      </div>

      {/* Groups Section */}
      {isConnected && (
        <div className="section">
          <h2>Groups</h2>
          
          {/* Join Group Form */}
          <form onSubmit={handleJoinGroup} className="join-group-form">
            <div className="input-group">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                required
              />
              <button type="submit" disabled={!groupName.trim()}>
                Join Group
              </button>
            </div>
          </form>

          {/* Joined Groups */}
          {joinedGroups.length > 0 && (
            <div className="joined-groups">
              <h3>Joined Groups:</h3>
              <div className="groups-list">
                {joinedGroups.map((group) => (
                  <div key={group} className="group-item">
                    <span 
                      className={`group-name ${selectedGroup === group ? 'selected' : ''}`}
                      onClick={() => setSelectedGroup(group)}
                    >
                      {group}
                    </span>
                    <button 
                      onClick={() => handleLeaveGroup(group)}
                      className="leave-btn"
                      title="Leave group"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messaging Section */}
      {isConnected && selectedGroup && (
        <div className="section">
          <h2>Messages for "{selectedGroup}"</h2>
          
          {/* Send Message Form */}
          <form onSubmit={handleSendMessage} className="send-message-form">
            <div className="input-group">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                required
              />
              <button type="submit" disabled={!messageText.trim()}>
                Send
              </button>
            </div>
          </form>

          {/* Messages Display */}
          <div className="messages-container">
            <div className="messages-header">
              <span>Messages</span>
              {messages.length > 0 && (
                <button onClick={clearMessages} className="clear-messages-btn">
                  Clear Messages
                </button>
              )}
            </div>
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="no-messages">No messages yet</div>
              ) : (
                messages
                  .filter(msg => msg.type === 'group' && msg.groupName === selectedGroup)
                  .map((message, index) => (
                    <div key={index} className="message-item">
                      <div className="message-header">
                        <span className="message-user">{message.user}</span>
                        <span className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="message-content">{message.message}</div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="section instructions">
        <h2>Instructions</h2>
        <ol>
          <li>Enter your SignalR hub URL and click "Connect"</li>
          <li>Once connected, enter a group name and click "Join Group"</li>
          <li>Select a group from your joined groups to start messaging</li>
          <li>Type messages and send them to the selected group</li>
          <li>You can join multiple groups and switch between them</li>
        </ol>
      </div>
    </div>
  );
};

export default SignalRApp;
