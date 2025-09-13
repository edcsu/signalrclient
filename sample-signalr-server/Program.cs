using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddSignalR(options =>
{
    // Configure SignalR options for better debugging
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
    options.HandshakeTimeout = TimeSpan.FromSeconds(30);
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.MaximumParallelInvocationsPerClient = 2;
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins(
            "http://localhost:3000",   // Create React App default
            "http://localhost:5173",   // Vite default
            "http://localhost:5174",   // Vite alternative
            "http://localhost:5175"    // Vite alternative
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials(); // Required for SignalR
    });
});

// Add logging
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.SetMinimumLevel(LogLevel.Information);
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Middleware order is important!
app.UseCors();           // Must be before UseRouting
app.UseRouting();
// app.UseAuthentication(); // Uncomment if you need authentication
// app.UseAuthorization();  // Uncomment if you need authorization

// Map the SignalR hub
app.MapHub<ChatHub>("/chathub");

// Optional: Add a simple health check endpoint
app.MapGet("/", () => "SignalR Server is running!");
app.MapGet("/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

app.Run();

// SignalR Hub implementation
public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ILogger<ChatHub> logger)
    {
        _logger = logger;
    }

    // Connection lifecycle events
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId} from {RemoteIpAddress}", 
            Context.ConnectionId, 
            Context.GetHttpContext()?.Connection.RemoteIpAddress);
        
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception != null)
        {
            _logger.LogError(exception, "Client {ConnectionId} disconnected with error", Context.ConnectionId);
        }
        else
        {
            _logger.LogInformation("Client {ConnectionId} disconnected normally", Context.ConnectionId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    // Hub methods that the client can call
    public async Task JoinGroup(string groupName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
            {
                _logger.LogWarning("Client {ConnectionId} attempted to join empty group", Context.ConnectionId);
                await Clients.Caller.SendAsync("Error", "Group name cannot be empty");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Client {ConnectionId} joined group '{GroupName}'", Context.ConnectionId, groupName);
            
            // Notify the caller they successfully joined
            await Clients.Caller.SendAsync("JoinedGroup", groupName);
            
            // Optionally notify other group members
            await Clients.Group(groupName).SendAsync("UserJoinedGroup", groupName, Context.ConnectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding client {ConnectionId} to group '{GroupName}'", Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("Error", $"Failed to join group: {ex.Message}");
        }
    }

    public async Task LeaveGroup(string groupName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
            {
                return;
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Client {ConnectionId} left group '{GroupName}'", Context.ConnectionId, groupName);
            
            // Notify the caller they left
            await Clients.Caller.SendAsync("LeftGroup", groupName);
            
            // Optionally notify other group members
            await Clients.Group(groupName).SendAsync("UserLeftGroup", groupName, Context.ConnectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing client {ConnectionId} from group '{GroupName}'", Context.ConnectionId, groupName);
            await Clients.Caller.SendAsync("Error", $"Failed to leave group: {ex.Message}");
        }
    }

    public async Task SendMessageToGroup(string groupName, string message)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(groupName))
            {
                await Clients.Caller.SendAsync("Error", "Group name cannot be empty");
                return;
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                await Clients.Caller.SendAsync("Error", "Message cannot be empty");
                return;
            }

            // Get user identifier (you can customize this based on your auth setup)
            var user = Context.User?.Identity?.Name ?? $"User-{Context.ConnectionId[..8]}";
            
            // Send message to all clients in the group
            await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", groupName, user, message);
            
            _logger.LogInformation("Message sent to group '{GroupName}' by {User}: {Message}", 
                groupName, user, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message to group '{GroupName}'", groupName);
            await Clients.Caller.SendAsync("Error", $"Failed to send message: {ex.Message}");
        }
    }

    // Optional: Method to send direct messages
    public async Task SendMessage(string user, string message)
    {
        try
        {
            var sender = Context.User?.Identity?.Name ?? $"User-{Context.ConnectionId[..8]}";
            await Clients.All.SendAsync("ReceiveMessage", sender, message);
            _logger.LogInformation("Broadcast message from {Sender}: {Message}", sender, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending broadcast message");
            await Clients.Caller.SendAsync("Error", $"Failed to send message: {ex.Message}");
        }
    }

    // Utility method for testing - returns connection ID
    public async Task GetConnectionId()
    {
        await Clients.Caller.SendAsync("ConnectionId", Context.ConnectionId);
    }

    // Utility method for testing - echo back a message
    public async Task Echo(string message)
    {
        await Clients.Caller.SendAsync("Echo", $"Echo: {message}");
    }
}
