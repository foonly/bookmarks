# Bookmark Sync Backend Specification

This document defines the technical specification for a decentralized storage vault designed to synchronize encrypted bookmark data across multiple devices. The backend acts as a "dumb" storage provider for opaque, versioned blobs.

## Overview

The backend is responsible for storing and retrieving encrypted data blobs. It does not possess the keys to decrypt the data, ensuring that all synchronization remains private and secure (Zero-Knowledge).

- **Authentication**: Keyless. Identification is handled via a unique `Sync ID`.
- **Security**: Data must be encrypted client-side using **AES-GCM**.
- **Storage**: Each `Sync ID` supports versioned history (default: last 10 versions).

---

## API Specification

All endpoints are prefixed with `/api/v1`.

### 1. Get Latest Sync Data

Retrieves the most recent encrypted blob for a specific ID.

- **URL**: `GET /sync/:id`
- **Success Response (200 OK)**:
  ```json
  {
  	"data": "base64_encoded_encrypted_blob",
  	"timestamp": 1625000000
  }
  ```
- **Error Response (404 Not Found)**: The provided ID does not exist.

### 2. Upload Sync Data

Uploads a new encrypted blob. This action automatically triggers history pruning.

- **URL**: `POST /sync/:id`
- **Request Body**:
  ```json
  {
  	"data": "base64_encoded_encrypted_blob"
  }
  ```
- **Success Response (201 Created)**: Blob stored successfully.
- **Error Response (413 Payload Too Large)**: Payload exceeds the 1MB limit.
- **Error Response (429 Too Many Requests)**: Rate limit exceeded for this ID.

### 3. Get Version History

Lists the timestamps of available historical versions for recovery.

- **URL**: `GET /sync/:id/history`
- **Success Response (200 OK)**:
  ```json
  [
  	{ "timestamp": 1625000000 },
  	{ "timestamp": 1624999000 },
  	{ "timestamp": 1624998000 }
  ]
  ```

### 4. Get Specific Version (Recovery)

Retrieves a specific historical blob by its timestamp.

- **URL**: `GET /sync/:id/:timestamp`
- **Success Response (200 OK)**:
  ```json
  {
  	"data": "base64_encoded_encrypted_blob",
  	"timestamp": 1624999000
  }
  ```

---

## System Constraints & Rules

### Data Retention

- **History Limit**: The server retains exactly the **last 10 versions** per `Sync ID`.
- **Pruning**: Upon a successful `POST`, the oldest version exceeding the limit is permanently deleted.

### Limits

- **Max Payload Size**: 1MB per request.
- **Rate Limiting**:
  - **POST**: 5 requests per minute per `Sync ID`.
  - **GET**: 30 requests per minute per `Sync ID`.

### Persistence Requirements

- The backend must use a persistent store (SQLite, BadgerDB, or similar).
- Database should index `id` and `timestamp` for performant lookups and pruning.

### Security & CORS

- **CORS**: The server must allow Cross-Origin Resource Sharing from the trusted frontend origin.
- **Privacy**: The server must never receive the decryption key. The `:id` in the URL identifies the bucket, but the `:key` remains strictly on the client.
