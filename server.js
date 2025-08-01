const express = require("express");
const http = require("http");
const path = require("path");
const World = require("./World"); // Import the World class.

const app = express();
// Render automatically provides a PORT environment variable.
const PORT = process.env.PORT || 10000;

// Create an HTTP server
const server = http.createServer(app);

// --- Create and manage your worlds here. ---
// This is now done by creating instances of the World class.
const worlds = [
  new World("Fireplane", "/worlds/fireplane", "fire", 100)
];

// Map world paths to their corresponding WebSocket server instances.
const worldWebSocketServers = new Map();
worlds.forEach(world => {
  worldWebSocketServers.set(world.path, world.wss);
});

// Serve static files from a 'public' folder.
app.use(express.static(path.join(__dirname, "public")));

// Serve `index.html`
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Upgrade WebSocket
server.on("upgrade", (req, socket, head) => {
  // Find the world instance based on the URL path.
  const worldPath = worlds.find(w => req.url.startsWith(w.path));
  
  if (worldPath) {
    const wssInstance = worldWebSocketServers.get(worldPath.path);
    if (wssInstance) {
      wssInstance.handleUpgrade(req, socket, head, (ws) => {
        wssInstance.emit("connection", ws, req);
      });
    }
  } else {
    // If the path doesn't match any world, reject the upgrade
    socket.write("HTTP/1.1 404 Not Found\\r\\n\\r\\n");
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});
