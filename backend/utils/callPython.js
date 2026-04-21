// ─────────────────────────────────────────
// utils/callPython.js
// Spawns the Python validator as a subprocess
// Node → Python → JSON result back to Node
// ─────────────────────────────────────────
const { spawn } = require("child_process");
const path      = require("path");

const SCRIPT = path.join(__dirname, "../validator.py");

function callPythonValidator(filePath, module = "vendor_master") {
  return new Promise((resolve, reject) => {

    // Windows needs "python" not "python3"
    const PYTHON = process.env.PYTHON_PATH || "python";

    const args = [
      "-u",          // CRITICAL: forces unbuffered stdout on Windows
      SCRIPT,
      "--file",   filePath,
      "--module", module,
    ];

    console.log(`[python] spawning: ${PYTHON} ${args.join(" ")}`);

    const proc = spawn(PYTHON, args, {
      cwd: path.join(__dirname, ".."), // run from backend/ so relative paths work
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", chunk => {
      const text = chunk.toString("utf8");
      stdout += text;
      console.log(`[python stdout +${text.length} chars]`);
    });

    proc.stderr.on("data", chunk => {
      const text = chunk.toString("utf8");
      stderr += text;
      if (text.trim()) {
        console.error("[python stderr]:", text.slice(0, 300));
      }
    });

    proc.on("close", code => {
      console.log(`[python] exited code=${code} stdout_len=${stdout.length}`);

      if (stdout.length === 0) {
        return reject(new Error(
          `Python produced no output. stderr: ${stderr.slice(0, 300)}`
        ));
      }

      // Extract JSON — strips any accidental leading/trailing text
      const jsonStart = stdout.indexOf("{");
      const jsonEnd   = stdout.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1) {
        return reject(new Error(
          `No JSON found in Python output: ${stdout.slice(0, 300)}`
        ));
      }

      const jsonStr = stdout.slice(jsonStart, jsonEnd + 1);

      try {
        const result = JSON.parse(jsonStr);
        resolve(result);
      } catch (e) {
        reject(new Error(
          `JSON parse failed: ${e.message}. First 300 chars: ${jsonStr.slice(0, 300)}`
        ));
      }
    });

    proc.on("error", err => {
      if (err.code === "ENOENT" && PYTHON === "python") {
        console.log("[python] 'python' not found, retrying with 'python3'...");
        callPythonValidatorWithPath("python3", filePath, module)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(
          `Failed to start Python (${PYTHON}): ${err.message}. ` +
          `Make sure Python is installed and in your PATH.`
        ));
      }
    });

    // Safety timeout — 120 seconds max
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(
        "Python timed out after 120 seconds. " +
        `stdout so far: ${stdout.slice(0, 200)}`
      ));
    }, 120000);

    proc.on("close", () => clearTimeout(timeout));
  });
}

function callPythonValidatorWithPath(pythonPath, filePath, module) {
  return new Promise((resolve, reject) => {
    const SCRIPT = path.join(__dirname, "../validator.py");
    const args   = ["-u", SCRIPT, "--file", filePath, "--module", module];

    const proc = spawn(pythonPath, args, {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
    });

    let stdout = "", stderr = "";
    proc.stdout.on("data", c => { stdout += c.toString("utf8"); });
    proc.stderr.on("data", c => { stderr += c.toString("utf8"); });

    proc.on("close", code => {
      const jsonStart = stdout.indexOf("{");
      const jsonEnd   = stdout.lastIndexOf("}");
      if (jsonStart === -1) return reject(new Error(`No JSON. stderr: ${stderr.slice(0,200)}`));
      try {
        resolve(JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)));
      } catch(e) {
        reject(new Error(`Parse failed: ${e.message}`));
      }
    });

    proc.on("error", err => reject(new Error(`${pythonPath} failed: ${err.message}`)));
  });
}

function callPythonChat(prompt, context) {
  return new Promise((resolve, reject) => {
    const PYTHON = process.env.PYTHON_PATH || "python";
    const CHAT_SCRIPT = path.join(__dirname, "../chat.py");
    const args = ["-u", CHAT_SCRIPT];
    
    const proc = spawn(PYTHON, args, {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", chunk => stdout += chunk.toString("utf8"));
    proc.stderr.on("data", chunk => stderr += chunk.toString("utf8"));

    proc.on("close", code => {
      try {
        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}");
        if (jsonStart === -1) {
          resolve({ reply: "Failed to get a valid response from AI." });
        } else {
          resolve(JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)));
        }
      } catch (e) {
        resolve({ reply: "Failed to parse AI response." });
      }
    });

    proc.on("error", err => resolve({ reply: "Error starting Python process." }));

    // Send data to stdin
    proc.stdin.write(JSON.stringify({ prompt, context }));
    proc.stdin.end();
  });
}

module.exports = { callPythonValidator, callPythonChat };