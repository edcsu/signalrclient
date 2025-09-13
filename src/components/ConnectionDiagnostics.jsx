import React, { useState } from 'react';

const ConnectionDiagnostics = ({ hubUrl, connectionState }) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const testConnection = async () => {
    const results = [];
    
    try {
      // Test URL format
      const url = new URL(hubUrl);
      results.push({ test: 'URL Format', status: 'pass', message: 'Valid URL format' });
      
      // Test if server is reachable (basic fetch test)
      const baseUrl = `${url.protocol}//${url.host}`;
      try {
        await fetch(baseUrl, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: AbortSignal.timeout(5000)
        });
        results.push({ 
          test: 'Server Reachability', 
          status: 'pass', 
          message: 'Server appears to be reachable' 
        });
      } catch (fetchError) {
        results.push({ 
          test: 'Server Reachability', 
          status: 'fail', 
          message: `Cannot reach server: ${fetchError.message}` 
        });
      }
      
      // Check protocol
      if (url.protocol === 'https:' && url.hostname === 'localhost') {
        results.push({ 
          test: 'HTTPS on localhost', 
          status: 'warning', 
          message: 'Using HTTPS on localhost may require accepting certificate' 
        });
      }
      
    } catch (error) {
      results.push({ test: 'URL Format', status: 'fail', message: error.message });
    }
    
    return results;
  };

  const [diagnosticResults, setDiagnosticResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const results = await testConnection();
    setDiagnosticResults(results);
    setTesting(false);
  };

  const commonSolutions = [
    {
      problem: "Connection closed with an error",
      solutions: [
        "Check if the SignalR server is running",
        "Verify the hub URL is correct",
        "Ensure the hub endpoint is properly configured on the server",
        "Check server logs for any errors",
        "Try using HTTP instead of HTTPS for local development"
      ]
    },
    {
      problem: "CORS issues",
      solutions: [
        "Configure CORS policy on the server to allow your client domain",
        "Add proper AllowCredentials configuration if needed",
        "Check server CORS middleware setup"
      ]
    },
    {
      problem: "SSL Certificate issues",
      solutions: [
        "Accept the certificate in your browser by visiting the hub URL",
        "Use HTTP instead of HTTPS for local development",
        "Configure proper SSL certificates on the server"
      ]
    }
  ];

  if (!showDiagnostics) {
    return (
      <button 
        onClick={() => setShowDiagnostics(true)}
        className="diagnostics-btn"
        style={{ marginTop: '10px', padding: '5px 10px', fontSize: '12px' }}
      >
        🔧 Connection Diagnostics
      </button>
    );
  }

  return (
    <div className="diagnostics-panel" style={{ 
      marginTop: '15px', 
      padding: '15px', 
      border: '1px solid #ddd', 
      borderRadius: '5px',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Connection Diagnostics</h3>
        <button 
          onClick={() => setShowDiagnostics(false)}
          style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Current Status:</strong>
        <ul style={{ fontSize: '12px', margin: '5px 0' }}>
          <li>Connection State: {connectionState?.state || 'Unknown'}</li>
          <li>Connection ID: {connectionState?.connectionId || 'None'}</li>
          <li>Is Connected: {connectionState?.isConnected ? 'Yes' : 'No'}</li>
        </ul>
      </div>

      <button 
        onClick={runDiagnostics}
        disabled={testing}
        style={{ marginBottom: '15px', padding: '5px 10px' }}
      >
        {testing ? 'Testing...' : 'Run Connection Tests'}
      </button>

      {diagnosticResults.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Test Results:</strong>
          {diagnosticResults.map((result, index) => (
            <div key={index} style={{ 
              fontSize: '12px', 
              padding: '5px', 
              margin: '2px 0',
              backgroundColor: result.status === 'pass' ? '#d4edda' : 
                              result.status === 'warning' ? '#fff3cd' : '#f8d7da',
              borderRadius: '3px'
            }}>
              <strong>{result.test}:</strong> {result.message}
            </div>
          ))}
        </div>
      )}

      <div>
        <strong>Common Solutions:</strong>
        {commonSolutions.map((item, index) => (
          <details key={index} style={{ fontSize: '12px', margin: '10px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              {item.problem}
            </summary>
            <ul style={{ marginTop: '5px' }}>
              {item.solutions.map((solution, idx) => (
                <li key={idx} style={{ margin: '2px 0' }}>{solution}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
};

export default ConnectionDiagnostics;
