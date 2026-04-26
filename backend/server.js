require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./src/models/User");

connectDB();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Dev-friendly: allow any origin (including Vite's fallback ports like 5174).
      // If you want to lock this down, set FRONTEND_URL in backend/.env.
      if (process.env.FRONTEND_URL) {
        return callback(null, origin === process.env.FRONTEND_URL);
      }

      return callback(null, true);
    },
    methods: ["GET", "POST"],
  },
});

// In-memory: { userId -> { userId, name, email, lat, lng, accuracy, updatedAt } }
const liveLocations = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.user?.id;

  let profile = null;
  try {
    profile = await User.findById(userId).select("name email");
  } catch {
    // If DB read fails, still allow the socket but keep minimal identity.
  }

  const identity = {
    userId: String(userId || ""),
    name: profile?.name || "User",
    email: profile?.email || "",
  };

  // Send current known locations to the new client.
  socket.emit("locations:sync", {
    users: Array.from(liveLocations.values()),
  });

  socket.on("location:update", (payload = {}) => {
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const accuracy = payload.accuracy == null ? null : Number(payload.accuracy);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const next = {
      ...identity,
      lat,
      lng,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      updatedAt: new Date().toISOString(),
    };

    liveLocations.set(identity.userId, next);
    io.emit("locations:update", { users: Array.from(liveLocations.values()) });
  });

  socket.on("location:stop", () => {
    if (!identity.userId) return;
    liveLocations.delete(identity.userId);
    io.emit("locations:update", { users: Array.from(liveLocations.values()) });
  });

  socket.on("disconnect", () => {
    if (!identity.userId) return;
    liveLocations.delete(identity.userId);
    io.emit("locations:update", { users: Array.from(liveLocations.values()) });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Renzi backend running on port ${PORT}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use. Stop the other process using this port, or set PORT to a free port in backend/.env.`
    );
    process.exit(1);
  }

  console.error("❌ Server error:", error);
  process.exit(1);
});
