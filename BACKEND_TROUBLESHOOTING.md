# SignalR C# Backend API Troubleshooting Guide

## Common Backend Issues Causing "Connection closed with an error"

### 1. **Missing or Incorrect Hub Registration**

**Problem**: Hub not properly registered in Program.cs or Startup.cs
```csharp
// ❌ WRONG - Hub not registered
var app = builder.Build();
app.Run();

// ✅ CORRECT
var app = builder.Build();
app.MapHub<ChatHub>("/chathub");  // Missing this line causes connection failures
app.Run();
```

**Solution**:
```csharp
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSignalR();

var app = builder.Build();
app.MapHub<ChatHub>("/chathub");  // Must match client URL
app.Run();
```

### 2. **CORS Configuration Issues**

**Problem**: Cross-Origin requests blocked
```csharp
// ❌ WRONG - No CORS or restrictive CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins("https://mysite.com"); // Too restrictive for dev
    });
});
```

**Solution**:
```csharp
// ✅ CORRECT - Proper CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:5175")
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();
app.UseCors(); // Must be called before UseRouting()
app.UseRouting();
app.MapHub<ChatHub>("/chathub");
```

### 3. **Hub Method Implementation Issues**

**Problem**: Hub methods throwing exceptions
```csharp
// ❌ WRONG - Methods can throw unhandled exceptions
public class ChatHub : Hub
{
    public async Task JoinGroup(string groupName)
    {
        // This will crash if groupName is null/empty
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }
}
```

**Solution**:
```csharp
// ✅ CORRECT - Proper error handling
public class ChatHub : Hub
{
    public async Task JoinGroup(string groupName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
            {
                await Clients.Caller.SendAsync("Error", "Group name cannot be empty");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("JoinedGroup", groupName);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Failed to join group: {ex.Message}");
        }
    }

    public async Task LeaveGroup(string groupName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
                return;

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("LeftGroup", groupName);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Failed to leave group: {ex.Message}");
        }
    }

    public async Task SendMessageToGroup(string groupName, string message)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(message))
                return;

            var user = Context.User?.Identity?.Name ?? "Anonymous";
            await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", groupName, user, message);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", $"Failed to send message: {ex.Message}");
        }
    }
}
```

### 4. **Authentication/Authorization Issues**

**Problem**: Unexpected authentication requirements
```csharp
// ❌ WRONG - Global auth requirement without proper setup
builder.Services.AddAuthentication().AddJwtBearer();
app.UseAuthentication();
app.UseAuthorization();
// SignalR connections will fail if not authenticated
```

**Solution**:
```csharp
// ✅ Option 1: Disable auth for SignalR testing
[AllowAnonymous]
public class ChatHub : Hub
{
    // Hub methods
}

// ✅ Option 2: Proper auth setup
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Cookies";
    options.DefaultChallengeScheme = "oidc";
})
.AddCookie("Cookies")
.AddOpenIdConnect("oidc", options =>
{
    // Configure your auth provider
});
```

### 5. **Middleware Order Issues**

**Problem**: Incorrect middleware order
```csharp
// ❌ WRONG - Middleware order matters
var app = builder.Build();
app.UseRouting();
app.UseCors(); // CORS after routing won't work properly
app.UseAuthentication();
app.MapHub<ChatHub>("/chathub");
```

**Solution**:
```csharp
// ✅ CORRECT - Proper middleware order
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseCors(); // Before routing
app.UseRouting();
app.UseAuthentication(); // Before authorization
app.UseAuthorization();
app.MapHub<ChatHub>("/chathub");
app.Run();
```

### 6. **HTTPS/SSL Certificate Issues**

**Problem**: SSL certificate problems in development
```csharp
// ❌ WRONG - Forcing HTTPS in development
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.UseHttpsRedirection(); // Can cause issues in dev
```

**Solution**:
```csharp
// ✅ CORRECT - Conditional HTTPS
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
// Or configure to listen on both HTTP and HTTPS
```

### 7. **Connection Limits and Timeouts**

**Problem**: Default timeout settings too aggressive
```csharp
// ❌ Default settings might be too restrictive
builder.Services.AddSignalR();
```

**Solution**:
```csharp
// ✅ CORRECT - Configure timeouts for your needs
builder.Services.AddSignalR(options =>
{
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.HandshakeTimeout = TimeSpan.FromSeconds(30);
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.MaximumParallelInvocationsPerClient = 2;
});
```

### 8. **Logging and Error Handling**

**Problem**: No logging to debug issues
```csharp
// ❌ WRONG - No logging
public class ChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }
}
```

**Solution**:
```csharp
// ✅ CORRECT - Proper logging
public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ILogger<ChatHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        if (exception != null)
        {
            _logger.LogError(exception, "Client disconnected with error: {ConnectionId}", Context.ConnectionId);
        }
        else
        {
            _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
```

## Complete Working Example

Here's a complete, working SignalR backend setup:

```csharp
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSignalR(options =>
{
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.HandshakeTimeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins(
            "http://localhost:3000",
            "http://localhost:5173", 
            "http://localhost:5174",
            "http://localhost:5175"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

builder.Services.AddLogging();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseCors();
app.UseRouting();

// Map hub
app.MapHub<ChatHub>("/chathub");

app.Run();

// Hub implementation
public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ILogger<ChatHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        if (exception != null)
        {
            _logger.LogError(exception, "Client disconnected with error: {ConnectionId}", Context.ConnectionId);
        }
        else
        {
            _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinGroup(string groupName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
            {
                _logger.LogWarning("Attempt to join empty group name from {ConnectionId}", Context.ConnectionId);
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Client {ConnectionId} joined group {GroupName}", Context.ConnectionId, groupName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding client {ConnectionId} to group {GroupName}", Context.ConnectionId, groupName);
            throw;
        }
    }

    public async Task LeaveGroup(string groupName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
                return;

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Client {ConnectionId} left group {GroupName}", Context.ConnectionId, groupName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing client {ConnectionId} from group {GroupName}", Context.ConnectionId, groupName);
            throw;
        }
    }

    public async Task SendMessageToGroup(string groupName, string message)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(message))
                return;

            var user = Context.User?.Identity?.Name ?? "Anonymous";
            await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", groupName, user, message);
            _logger.LogInformation("Message sent to group {GroupName} by {User}", groupName, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message to group {GroupName}", groupName);
            throw;
        }
    }

    // Optional: Method to get connection ID for testing
    public async Task GetConnectionId()
    {
        await Clients.Caller.SendAsync("ConnectionId", Context.ConnectionId);
    }
}
```

## Debugging Backend Issues

### Check Server Logs
Enable detailed logging in `appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore.SignalR": "Debug",
      "Microsoft.AspNetCore.Http.Connections": "Debug"
    }
  }
}
```

### Test Hub Endpoints
1. **Direct HTTP Test**: Visit `https://localhost:7000/chathub/negotiate` in browser
2. **Check Hub Registration**: Ensure you see SignalR negotiation response
3. **Verify CORS**: Check browser Network tab for CORS errors

### Common Error Messages and Solutions

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| "Failed to start connection" | Hub not registered | Add `app.MapHub<ChatHub>("/chathub")` |
| "CORS policy" | CORS misconfiguration | Fix CORS origins and credentials |
| "401 Unauthorized" | Authentication required | Add `[AllowAnonymous]` or configure auth |
| "404 Not Found" | Wrong hub URL | Check hub path registration |
| "500 Internal Server Error" | Hub method exception | Add try-catch in hub methods |
