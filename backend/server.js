// ─────────────────────────────────────────
// server.js  —  ReconSphere Express Server
// ─────────────────────────────────────────

require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const validateRouter = require("./routes/validate");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve frontend files ──
// This must come BEFORE the 404 handler but AFTER middleware
app.use(express.static(path.join(__dirname, "../frontend")));

// Serve uploaded files temporarily
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ──
app.use("/api", validateRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ReconSphere API", version: "1.0.0" });
});

// ── 404 fallback ──
// Send index.html for any unknown route so frontend routing works
app.use((req, res, next) => {
  // If it's an API route that wasn't found, return JSON error
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  // For everything else, serve the frontend
  const indexPath = path.join(__dirname, "../frontend/index.html");
  res.sendFile(indexPath, err => {
    if (err) next(err);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`ReconSphere running on http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API:      http://localhost:${PORT}/api/validate`);
  console.log(`Health:   http://localhost:${PORT}/health`);
});