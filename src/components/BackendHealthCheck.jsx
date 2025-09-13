import React, { useState } from 'react';

const BackendHealthCheck = ({ hubUrl }) => {
  const [healthResults, setHealthResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const runHealthChecks = async () => {
    setTesting(true);
    const results = [];

    try {
      const url = new URL(hubUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      
      // Test 1: Server reachability
      try {
        const response = await fetch(baseUrl, { 
          method: 'HEAD',
          mode: 'cors'
        });
        results.push({
          test: 'Server Reachability',
          status: response.ok ? 'pass' : 'warning',
          message: response.ok ? 
            `Server responding (${response.status})` : 
            `Server responded with status ${response.status}`
        });
      } catch (error) {
        results.push({
          test: 'Server Reachability',
          status: 'fail',
          message: `Cannot reach server: ${error.message}`
        });
      }

      // Test 2: SignalR negotiate endpoint
      try {
        const negotiateUrl = `${hubUrl}/negotiate`;
        const response = await fetch(negotiateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            test: 'SignalR Negotiate',
            status: 'pass',
            message: `Negotiate successful. Available transports: ${data.availableTransports?.map(t => t.transport).join(', ') || 'unknown'}`
          });
        } else if (response.status === 404) {
          results.push({
            test: 'SignalR Negotiate',
            status: 'fail',
            message: 'Hub not found (404). Check if hub is registered at the correct path.'
          });
        } else if (response.status === 405) {
          results.push({
            test: 'SignalR Negotiate',
            status: 'fail',
            message: 'Method not allowed (405). SignalR might not be properly configured.'
          });
        } else {
          results.push({
            test: 'SignalR Negotiate',
            status: 'fail',
            message: `Negotiate failed with status ${response.status}`
          });
        }
      } catch (error) {
        if (error.message.includes('CORS')) {
          results.push({
            test: 'SignalR Negotiate',
            status: 'fail',
            message: 'CORS error - server needs to allow your origin'
          });
        } else {
          results.push({
            test: 'SignalR Negotiate',
            status: 'fail',
            message: `Negotiate error: ${error.message}`
          });
        }
      }

      // Test 3: CORS preflight
      try {
        const response = await fetch(hubUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });

        if (response.ok || response.status === 204) {
          const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
          if (allowOrigin === '*' || allowOrigin === window.location.origin) {
            results.push({
              test: 'CORS Configuration',
              status: 'pass',
              message: 'CORS properly configured'
            });
          } else {
            results.push({
              test: 'CORS Configuration',
              status: 'warning',
              message: `CORS allows origin: ${allowOrigin || 'none'}`
            });
          }
        } else {
          results.push({
            test: 'CORS Configuration',
            status: 'fail',
            message: `CORS preflight failed (${response.status})`
          });
        }
      } catch (error) {
        console.error(error)
        results.push({
          test: 'CORS Configuration',
          status: 'warning',
          message: 'Cannot test CORS preflight'
        });
      }

      // Test 4: SSL/TLS (for HTTPS)
      if (url.protocol === 'https:') {
        try {
          await fetch(hubUrl, { method: 'HEAD' });
          results.push({
            test: 'SSL/TLS Certificate',
            status: 'pass',
            message: 'SSL certificate is valid'
          });      } catch {
        // SSL test failed - ignore for now since we already handle this in other tests
      }
      }

    } catch (error) {
      results.push({
        test: 'General Health Check',
        status: 'fail',
        message: `Health check failed: ${error.message}`
      });
    }

    setHealthResults(results);
    setTesting(false);
  };

  const getBackendDiagnostics = () => {
    return [
      {
        category: 'Hub Registration Issues',
        symptoms: ['404 Not Found', 'Failed to start connection'],
        solutions: [
          'Ensure app.MapHub<YourHub>("/hubpath") is called',
          'Check the hub path matches your client URL',
          'Verify the hub class inherits from Hub'
        ]
      },
      {
        category: 'CORS Issues',
        symptoms: ['CORS policy error', 'Access-Control-Allow-Origin'],
        solutions: [
          'Add CORS service: builder.Services.AddCors()',
          'Configure CORS policy with AllowCredentials()',
          'Call app.UseCors() before app.UseRouting()',
          'Include your client origin in WithOrigins()'
        ]
      },
      {
        category: 'Authentication Issues',
        symptoms: ['401 Unauthorized', 'Authentication required'],
        solutions: [
          'Add [AllowAnonymous] to hub for testing',
          'Configure authentication properly',
          'Check if global auth policy affects SignalR'
        ]
      },
      {
        category: 'Hub Method Exceptions',
        symptoms: ['Connection closed with error', '500 Internal Server Error'],
        solutions: [
          'Add try-catch blocks in hub methods',
          'Check server logs for exceptions',
          'Validate method parameters',
          'Use ILogger to log errors'
        ]
      }
    ];
  };

  return (
    <div style={{ 
      marginTop: '15px', 
      padding: '15px', 
      border: '1px solid #ddd', 
      borderRadius: '5px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Backend Health Check</h3>
      
      <button 
        onClick={runHealthChecks}
        disabled={testing}
        style={{ 
          marginBottom: '15px', 
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: testing ? 'not-allowed' : 'pointer'
        }}
      >
        {testing ? 'Running Tests...' : 'Run Backend Health Check'}
      </button>

      {healthResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', margin: '0 0 10px 0' }}>Health Check Results:</h4>
          {healthResults.map((result, index) => (
            <div key={index} style={{ 
              fontSize: '12px', 
              padding: '8px', 
              margin: '4px 0',
              backgroundColor: result.status === 'pass' ? '#d4edda' : 
                              result.status === 'warning' ? '#fff3cd' : '#f8d7da',
              borderRadius: '4px',
              border: `1px solid ${result.status === 'pass' ? '#c3e6cb' : 
                                  result.status === 'warning' ? '#ffeaa7' : '#f5c6cb'}`
            }}>
              <strong>{result.test}:</strong> {result.message}
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 style={{ fontSize: '14px', margin: '0 0 10px 0' }}>Common Backend Issues:</h4>
        {getBackendDiagnostics().map((category, index) => (
          <details key={index} style={{ fontSize: '12px', margin: '8px 0' }}>
            <summary style={{ 
              cursor: 'pointer', 
              fontWeight: 'bold',
              padding: '4px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px'
            }}>
              {category.category}
            </summary>
            <div style={{ marginTop: '8px', paddingLeft: '10px' }}>
              <div style={{ marginBottom: '5px' }}>
                <strong>Symptoms:</strong> {category.symptoms.join(', ')}
              </div>
              <div>
                <strong>Solutions:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {category.solutions.map((solution, idx) => (
                    <li key={idx} style={{ margin: '2px 0' }}>{solution}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#e7f3ff', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <strong>💡 Pro Tip:</strong> Check your browser's Network tab and server console logs for detailed error information.
      </div>
    </div>
  );
};

export default BackendHealthCheck;
