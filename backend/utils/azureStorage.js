// ─────────────────────────────────────────
// utils/azureStorage.js
// Azure Blob Storage helpers
// Upload, download, generate SAS URL
// ─────────────────────────────────────────

const { BlobServiceClient, generateBlobSASQueryParameters,
        BlobSASPermissions, StorageSharedKeyCredential } = require("@azure/storage-blob");
const fs   = require("fs");
const path = require("path");

const CONNECTION_STRING = process.env.AZURE_CONNECTION_STRING;
const CONTAINER_NAME    = process.env.AZURE_CONTAINER_NAME || "reconsphere-uploads";

function getClient() {
  if (!CONNECTION_STRING || CONNECTION_STRING.includes("your_azure")) {
    throw new Error("Azure connection string not configured in .env");
  }
  return BlobServiceClient.fromConnectionString(CONNECTION_STRING);
}

// ─────────────────────────────────────────
// Upload a local file to Azure Blob
// Returns the blob URL
// ─────────────────────────────────────────
async function uploadToAzure(localFilePath, blobName) {
  const client          = getClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const fileStream      = fs.createReadStream(localFilePath);
  const fileSize        = fs.statSync(localFilePath).size;

  await blockBlobClient.uploadStream(fileStream, fileSize);
  console.log(`[azure] uploaded: ${blobName}`);
  return blockBlobClient.url;
}

// ─────────────────────────────────────────
// Download a blob to a local path
// ─────────────────────────────────────────
async function downloadFromAzure(blobName, localPath) {
  const client          = getClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.downloadToFile(localPath);
  console.log(`[azure] downloaded: ${blobName} → ${localPath}`);
}

// ─────────────────────────────────────────
// Generate a SAS URL (expires in N minutes)
// ─────────────────────────────────────────
async function getSignedUrl(blobName, expiresInMinutes = 60) {
  const client          = getClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const sasUrl = await blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("r"), // read-only
    expiresOn,
  });

  return sasUrl;
}

module.exports = { uploadToAzure, downloadFromAzure, getSignedUrl };