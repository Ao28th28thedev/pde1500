// server.js - Node.js + Express server for multiplayer game worlds and Socket.IO

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io"); // Using socket.io

// Custom server-side modules
const World = require("./World");
const WorldSystem = require("./WorldSystem");

const app = express();
const PORT = process.env.PORT || 10000;
const server = http.createServer(app);

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // Middleware to parse JSON request bodies

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ⭐ Socket.IO Server Setup ⭐
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development. Restrict in production.
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userID; // Ensure case matches client query
    const worldId = socket.handshake.query.worldId;
    const authKey = socket.handshake.query.authKey;
    const zone = socket.handshake.query.zone || "skywatch-C3";

    console.log(`\n--- Socket.IO Connection Attempt ---`);
    console.log(`Socket ID: ${socket.id}`);
    console.log(`Query Params: User ID = ${userId || 'N/A'}, World ID = ${worldId || 'N/A'}, AuthKey = ${authKey ? 'PRESENT' : 'MISSING'}, Zone = ${zone}`);

    if (!userId || !worldId || !authKey) {
        console.error(`ERROR: Socket.IO connection rejected for socket ${socket.id}. Missing critical query parameters (userID: ${userId}, worldId: ${worldId}, authKey: ${authKey ? 'YES' : 'NO'}).`);
        socket.emit("serverConnectionError", "Missing authentication or world ID. Please relog.");
        socket.disconnect(true);
        return;
    }

    const targetWorld = World.allWorlds.find(w => w.id === worldId);
    if (targetWorld) {
        console.log(`Attempting to handle connection for world: ${targetWorld.name} (${worldId})`);
        targetWorld.handleConnection(socket);
    } else {
        console.warn(`WARNING: Socket.IO: Unknown worldId '${worldId}' for socket ${socket.id}. Disconnecting.`);
        socket.emit("serverConnectionError", "Invalid world selected.");
        socket.disconnect(true);
    }

    socket.on('disconnect', (reason) => {
        console.log(`Socket.IO client disconnected (Socket ID: ${socket.id}, User ID: ${userId || 'N/A'}): ${reason}`);
    });

    socket.on('connect_error', (error) => {
        console.error(`Socket.IO INTERNAL connection error (Socket ID: ${socket.id}, User ID: ${userId || 'N/A'}):`, error.message);
    });
});

// --- HTTP GET Endpoints ---

app.get("/game-api/v2/worlds", (req, res) => {
    console.log(`\n--- HTTP Request ---`);
    console.log(`Received HTTP GET request for /game-api/v2/worlds from IP: ${req.ip}`);
    const worldsInfo = World.allWorlds.map(w => ({
        id: w.id, // Ensure the client receives the 'id'
        name: w.name, path: w.path, icon: w.icon, full: w.full
    }));
    res.json(worldsInfo);
    console.log(`Responded with ${worldsInfo.length} worlds.`);
});

app.get("/game-api/world-list", (req, res) => {
    console.log(`\n--- HTTP Request ---`);
    console.log(`Received HTTP GET request for /game-api/world-list from IP: ${req.ip}`);
    const worldsInfo = World.allWorlds.map(w => ({
        id: w.id, name: w.name, path: w.path, playerCount: w.playerCount,
        maxPlayers: w.maxPlayers, tag: w.tag, icon: w.icon, full: w.full
    }));
    res.json(worldsInfo);
    console.log(`Responded with ${worldsInfo.length} worlds.`);
});

app.get("/game-api/status", (req, res) => {
    console.log(`\n--- HTTP Request ---`);
    console.log(`Received HTTP GET request for /game-api/status from IP: ${req.ip}`);
    res.json({ status: "ok", message: "Server is running" });
    console.log(`Responded with server status: OK.`);
});

app.post("/game-api/v1/game-event", (req, res) => {
    console.log(`\n--- Game Event POST Request ---`);
    console.log(`Received POST request for /game-api/v1/game-event from IP: ${req.ip}`);
    console.log(`Request Body (Game Event Data):`, JSON.stringify(req.body, null, 2));
    res.status(200).json({ status: "received", message: "Game event logged." });
    console.log(`Responded to game event POST.`);
});

// ⭐ NEW: HTTP POST for startMatchmaking ⭐
app.post("/game-api/v1/matchmaking-api/begin", (req, res) => {
    console.log(`\n--- Matchmaking: Start Request ---`);
    console.log(`Received POST request for /game-api/v1/matchmaking-api/begin from IP: ${req.ip}`);
    const { userID, level, score, playerData, token } = req.body;
    console.log(`User ${userID} wants to start matchmaking.`);
    console.log(`Level: ${level}, Score: ${score}, Player Data: ${JSON.stringify(playerData)}, Token: ${token ? 'PRESENT' : 'MISSING'}`);

    // Here, you would implement your actual matchmaking logic:
    // 1. Add the user to a matchmaking queue.
    // 2. Try to find an opponent based on level/score.
    // 3. If a match is found, send a response indicating the match.
    // 4. If no immediate match, send a response confirming they're in queue.

    // For now, send a success response to acknowledge the request.
    res.status(200).json({ status: "received", message: "Matchmaking request received. You are now in queue (simulated)." });
    console.log(`Responded to matchmaking start POST.`);
});

// ⭐ NEW: HTTP POST for quitMatchmaking ⭐
app.post("/game-api/v1/matchmaking-api/end", (req, res) => {
    console.log(`\n--- Matchmaking: Quit Request ---`);
    console.log(`Received POST request for /game-api/v1/matchmaking-api/end from IP: ${req.ip}`);
    const { userID, token } = req.body;
    console.log(`User ${userID} wants to quit matchmaking.`);
    console.log(`Token: ${token ? 'PRESENT' : 'MISSING'}`);

    // Here, you would remove the user from any active matchmaking queue.

    // For now, send a success response to acknowledge the request.
    res.status(200).json({ status: "received", message: "Matchmaking quit request received." });
    console.log(`Responded to matchmaking quit POST.`);
});


// --- Server Startup ---
server.listen(PORT, () => {
    console.log(`\n--- Server Startup ---`);
    console.log(`✅ Server is listening on port ${PORT}...`);
    console.log(`🌐 HTTP endpoints for world list, status, game events, and matchmaking are online.`);
    console.log(`🚀 Socket.IO server is online and ready for game world connections.`);
    console.log(`💡 Local Socket.IO client connection URL: 'ws://localhost:${PORT}'`);
    console.log(`💡 Render Socket.IO client connection URL: 'wss://YOUR_RENDER_APP_URL.onrender.com'`);
    console.log(`------------------------\n`);
});
