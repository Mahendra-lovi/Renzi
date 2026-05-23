const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const chatRoutes = require("./routes/chat.routes");
const itemRoutes = require("./routes/item.routes");
const rentalRoutes = require("./routes/rental.routes");
const app = express();

// middlewares
app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ limit: "6mb", extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/rentals", rentalRoutes);

// health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Renzi Backend",
    time: new Date()
  });
});

module.exports = app;
