// ─────────────────────────────────────────
// routes/validate.js  —  API Routes
// POST /api/validate   → upload + validate
// GET  /api/download   → download corrected file
// GET  /api/modules    → list available modules
// ─────────────────────────────────────────

const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { v4: uuidv4 } = require("uuid");

const { callPythonValidator, callPythonChat } = require("../utils/callPython");
const { uploadToAzure, downloadFromAzure, getSignedUrl } = require("../utils/azureStorage");

const router = express.Router();

// ── Multer: save uploads to /uploads folder temporarily ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".csv", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only CSV and Excel files are allowed"));
  },
});

// ─────────────────────────────────────────
// POST /api/validate
// Body: multipart/form-data
//   file   → the Excel/CSV file
//   module → "vendor_master" | "material_master" | "customer_master"
// ─────────────────────────────────────────
router.post("/validate", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const module     = req.body.module || "vendor_master";
  const filePath   = req.file.path;
  const fileName   = req.file.originalname;
  const sessionId  = uuidv4();

  console.log(`[validate] file=${fileName} module=${module} session=${sessionId}`);

  try {
    // 1. Upload original file to Azure Blob (optional for local dev)
    // Azure upload — skip entirely if not configured
let azureUrl = null;
const connStr = process.env.AZURE_CONNECTION_STRING || '';
const azureConfigured = connStr.length > 50 
  && !connStr.includes('your_azure') 
  && !connStr.includes('AccountName=...')
  && !connStr.includes('AccountKey=...');

if (azureConfigured) {
  try {
    azureUrl = await uploadToAzure(filePath, `uploads/${sessionId}_${fileName}`);
    console.log(`[azure] uploaded → ${azureUrl}`);
  } catch (azureErr) {
    console.log(`[azure] skipped — ${azureErr.message}`);
  }
} else {
  console.log('[azure] not configured — skipping blob upload');
}

    // 2. Run Python validation engine
    const result = await callPythonValidator(filePath, module);

    // 3. Attach session ID for later download
    result.sessionId  = sessionId;
    result.fileName   = fileName;
    result.module     = module;
    result.uploadedAt = new Date().toISOString();

    // 4. Clean up temp file
    fs.unlink(filePath, () => {});

    res.json(result);

  } catch (err) {
  console.error("[validate] FULL ERROR:", err); // CHANGE: was just err.message
  fs.unlink(filePath, () => {});
  res.status(500).json({ error: err.message, stack: err.stack });
}
});

// ─────────────────────────────────────────
// GET /api/modules
// Returns list of available SAP modules
// ─────────────────────────────────────────
router.get("/modules", (req, res) => {
  res.json({
    modules: [
      { id: "vendor_master",   label: "Vendor Master",   sap_table: "LFA1" },
      { id: "material_master", label: "Material Master", sap_table: "MARA" },
      { id: "customer_master", label: "Customer Master", sap_table: "KNA1" },
    ],
  });
});

// ─────────────────────────────────────────
// POST /api/download
// Body: { rows: [...corrected rows], fileName: "..." }
// Returns corrected CSV as download
// ─────────────────────────────────────────
router.post("/download", express.json(), (req, res) => {
  const { rows, fileName } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: "rows array required" });
  }

  // Build CSV from corrected rows
  if (rows.length === 0) return res.status(400).json({ error: "No rows provided" });

  const headers = Object.keys(rows[0]).join(",");
  const lines   = rows.map(row =>
    Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers, ...lines].join("\n");

  const outName = `corrected_${fileName || "output.csv"}`.replace(/\.(xlsx|xls)$/, ".csv");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
  res.send(csv);
});

// ─────────────────────────────────────────
// POST /api/chat
// Body: { prompt: "...", context: { ...row data } }
// ─────────────────────────────────────────
router.post("/chat", express.json(), async (req, res) => {
  const { prompt, context } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  
  try {
    const result = await callPythonChat(prompt, context || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Chat failed", details: err.message });
  }
});
// ─────────────────────────────────────────
// POST /api/azure/upload
// ─────────────────────────────────────────
router.post("/azure/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  
  try {
    const blobName = `sap-export-${Date.now()}-${req.file.originalname}`;
    await uploadToAzure(req.file.path, blobName);
    
    // Clean up local temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    
    // Generate SAS URL for download
    const url = await getSignedUrl(blobName, 60); // 60 mins expiry
    res.json({ message: "Successfully uploaded to Azure", url, blobName });
  } catch (err) {
    console.error("[Azure Error]", err);
    res.status(500).json({ error: "Azure upload failed", details: err.message });
  }
});

module.exports = router;