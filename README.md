# ReconSphere

**Where enterprise data meets intelligence.**

ReconSphere is an AI-powered, cloud-native SAP data migration validation tool. It takes raw migration data (like Vendor Master, Material Master, and Customer Master records), runs deterministic SAP validation rules, and then uses Gemini AI to automatically suggest corrections for unstructured issues like typos, casing errors, and formatting inconsistencies.

## 🌟 Key Features

* **AI Auto-Correction**: Uses Google Gemini to intelligently suggest fixes for data anomalies (e.g., standardizing company names, fixing postal codes).
* **Deterministic Rules**: Validates against SAP S/4HANA specific rules (e.g., IFSC formats, length constraints).
* **Multi-Module Support**: Handles Vendor Master (LFA1), Material Master (MARA), and Customer Master (KNA1).
* **Beautiful UI**: An interactive, glassmorphic UI built with pure HTML/CSS/JS, featuring a dynamic interactive grid, dark/light mode, and smooth animations.
* **Instant Export**: Download corrected data ready for SAP BDC/LSMW upload, or skipped rows for manual review.

## 🏗️ Architecture

```mermaid
graph LR
    A[Browser / Frontend] -->|File Upload via multipart/form-data| B(Node.js Express Server)
    B -->|Calls script via spawn| C{Python Validation Engine}
    C -->|Deterministic Checks| D[Rule Set (Regex/Logic)]
    C -->|Fuzzy/Contextual Checks| E[Google Gemini API]
    E -.->|AI Suggestions| C
    D -.->|Violations| C
    C -->|Returns JSON Results| B
    B -->|Sends JSON Response| A
    A -->|User Reviews & Accepts Fixes| A
    A -->|Downloads Corrected CSV| F[SAP S/4HANA Ready File]
```

## 🚀 Getting Started

### Prerequisites
* Node.js (v16+)
* Python (3.8+)
* A Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ReconSphere
   ```

2. **Setup the Backend (Node.js)**
   ```bash
   cd backend
   npm install
   ```

3. **Setup the Python Environment**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_api_key_here
   ```

5. **Run the Application**
   ```bash
   node server.js
   ```
   Open `http://localhost:3000` in your browser.

## 🛠️ Tech Stack
* **Frontend**: HTML5, Vanilla JavaScript, CSS3 (No heavy frameworks!)
* **Backend**: Node.js, Express.js
* **AI & Validation Engine**: Python, Google Generative AI (Gemini)
* **Design System**: Custom CSS variables, responsive fluid layouts

## 📸 Screenshots & Usage

1. **Upload your CSV/Excel file** containing SAP master data.
2. The AI will **scan and validate** every column against defined rules.
3. Review the **AI-suggested fixes** in the "Review & Fix" tab. You can use the ✨ *Accept All AI Fixes* button for high-confidence suggestions!
4. Head to the **Export** tab to download your finalized, SAP-ready data.
