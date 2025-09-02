# Rocket.Chat File Upload and Download Documentation

## Overview

Complete guide for handling file uploads, downloads, and media management in Rocket.Chat via API.

## File Upload

### Upload Endpoint

```javascript
// POST /api/v1/rooms.upload/:rid
// Multipart form data upload

const FormData = require('form-data');
const fs = require('fs');

async function uploadFile(roomId, filePath, description = '') {
  const form = new FormData();
  
  // Add file
  form.append('file', fs.createReadStream(filePath));
  
  // Optional metadata
  form.append('msg', description);
  form.append('description', description);
  form.append('tmid', threadId); // Optional: thread ID
  
  const response = await fetch(`${baseUrl}/api/v1/rooms.upload/${roomId}`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      ...form.getHeaders()
    },
    body: form
  });
  
  return response.json();
}
```

### Upload Response

```javascript
{
  "success": true,
  "message": {
    "_id": "message-id",
    "rid": "room-id",
    "ts": { "$date": 1642089660000 },
    "file": {
      "_id": "file-id",
      "name": "document.pdf",
      "type": "application/pdf",
      "size": 1024000,
      "description": "Project documentation",
      "url": "/file-upload/file-id/document.pdf"
    },
    "attachments": [{
      "title": "document.pdf",
      "title_link": "/file-upload/file-id/document.pdf",
      "title_link_download": true,
      "type": "file",
      "description": "Project documentation"
    }],
    "u": {
      "_id": "user-id",
      "username": "username",
      "name": "User Name"
    }
  }
}
```

### Multiple File Upload

```javascript
async function uploadMultipleFiles(roomId, files) {
  const uploads = [];
  
  for (const file of files) {
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path));
    form.append('msg', file.description || '');
    
    const response = await fetch(`${baseUrl}/api/v1/rooms.upload/${roomId}`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
        ...form.getHeaders()
      },
      body: form
    });
    
    uploads.push(await response.json());
  }
  
  return uploads;
}
```

### Upload with Progress Tracking

```javascript
const axios = require('axios');

async function uploadWithProgress(roomId, filePath, onProgress) {
  const form = new FormData();
  const fileStream = fs.createReadStream(filePath);
  const fileStats = fs.statSync(filePath);
  
  form.append('file', fileStream);
  
  const response = await axios.post(
    `${baseUrl}/api/v1/rooms.upload/${roomId}`,
    form,
    {
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / fileStats.size
        );
        onProgress(percentCompleted);
      }
    }
  );
  
  return response.data;
}

// Usage
uploadWithProgress(roomId, './large-file.zip', (percent) => {
  console.log(`Upload progress: ${percent}%`);
});
```

## File Download

### Download Endpoint

```javascript
// GET /file-upload/:fileId/:fileName
// Or with authentication token in URL
// GET /file-upload/:fileId/:fileName?rc_uid=userId&rc_token=authToken

async function downloadFile(fileId, fileName, savePath) {
  const response = await fetch(
    `${baseUrl}/file-upload/${fileId}/${fileName}`,
    {
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  fs.writeFileSync(savePath, buffer);
  
  return savePath;
}
```

### Stream Download for Large Files

```javascript
const https = require('https');
const fs = require('fs');

function streamDownload(fileUrl, savePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(savePath);
    
    https.get(`${baseUrl}${fileUrl}`, {
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId
      }
    }, (response) => {
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.pipe(file);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.round((downloadedSize / totalSize) * 100);
        console.log(`Download progress: ${percent}%`);
      });
      
      file.on('finish', () => {
        file.close();
        resolve(savePath);
      });
      
      file.on('error', (err) => {
        fs.unlink(savePath, () => {}); // Delete incomplete file
        reject(err);
      });
    }).on('error', reject);
  });
}
```

### Download with Resume Support

```javascript
class ResumableDownload {
  constructor(fileUrl, savePath) {
    this.fileUrl = fileUrl;
    this.savePath = savePath;
    this.tempPath = `${savePath}.download`;
  }
  
  async download() {
    const existingSize = this.getExistingFileSize();
    
    const response = await fetch(`${baseUrl}${this.fileUrl}`, {
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
        'Range': `bytes=${existingSize}-` // Resume from existing size
      }
    });
    
    if (response.status === 206) { // Partial content
      await this.appendToFile(response);
    } else if (response.status === 200) { // Full content
      await this.writeNewFile(response);
    } else {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    // Rename temp file to final name
    fs.renameSync(this.tempPath, this.savePath);
    return this.savePath;
  }
  
  getExistingFileSize() {
    try {
      return fs.statSync(this.tempPath).size;
    } catch {
      return 0;
    }
  }
  
  async appendToFile(response) {
    const stream = fs.createWriteStream(this.tempPath, { flags: 'a' });
    response.body.pipe(stream);
    
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
  
  async writeNewFile(response) {
    const stream = fs.createWriteStream(this.tempPath);
    response.body.pipe(stream);
    
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
```

## File Management

### List Room Files

```javascript
// GET /api/v1/rooms.files
async function getRoomFiles(roomId, options = {}) {
  const params = new URLSearchParams({
    roomId: roomId,
    offset: options.offset || 0,
    count: options.count || 50,
    sort: JSON.stringify(options.sort || { uploadedAt: -1 }),
    query: JSON.stringify(options.query || {})
  });
  
  const response = await fetch(`${baseUrl}/api/v1/rooms.files?${params}`, {
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId
    }
  });
  
  return response.json();
}

// Response
{
  "files": [{
    "_id": "file-id",
    "name": "document.pdf",
    "size": 1024000,
    "type": "application/pdf",
    "rid": "room-id",
    "userId": "user-id",
    "description": "Project documentation",
    "uploadedAt": { "$date": 1642089660000 },
    "url": "/file-upload/file-id/document.pdf",
    "typeGroup": "pdf"
  }],
  "count": 1,
  "offset": 0,
  "total": 1,
  "success": true
}
```

### Delete File

```javascript
// POST /api/v1/rooms.deleteFile
async function deleteFile(fileId) {
  const response = await fetch(`${baseUrl}/api/v1/rooms.deleteFile`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileId })
  });
  
  return response.json();
}
```

## Image Handling

### Upload Image with Thumbnail

```javascript
const sharp = require('sharp'); // Image processing library

async function uploadImageWithThumbnail(roomId, imagePath) {
  // Generate thumbnail
  const thumbnailBuffer = await sharp(imagePath)
    .resize(200, 200, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  // Upload original image
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));
  
  const response = await fetch(`${baseUrl}/api/v1/rooms.upload/${roomId}`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      ...form.getHeaders()
    },
    body: form
  });
  
  return response.json();
}
```

### Get Image Dimensions

```javascript
async function getImageInfo(fileUrl) {
  const response = await fetch(`${baseUrl}${fileUrl}`, {
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId
    }
  });
  
  const buffer = await response.buffer();
  const metadata = await sharp(buffer).metadata();
  
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length
  };
}
```

## Audio/Video Handling

### Upload Media with Metadata

```javascript
const ffmpeg = require('fluent-ffmpeg');

async function uploadMediaWithMetadata(roomId, mediaPath) {
  // Get media metadata
  const metadata = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(mediaPath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  
  const form = new FormData();
  form.append('file', fs.createReadStream(mediaPath));
  form.append('msg', `Duration: ${metadata.format.duration}s`);
  
  const response = await fetch(`${baseUrl}/api/v1/rooms.upload/${roomId}`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
      ...form.getHeaders()
    },
    body: form
  });
  
  return response.json();
}
```

### Stream Video

```javascript
// Stream video with range support
async function streamVideo(fileUrl, range) {
  const headers = {
    'X-Auth-Token': authToken,
    'X-User-Id': userId
  };
  
  if (range) {
    headers['Range'] = range;
  }
  
  const response = await fetch(`${baseUrl}${fileUrl}`, { headers });
  
  return {
    stream: response.body,
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
    acceptRanges: response.headers.get('accept-ranges'),
    contentRange: response.headers.get('content-range')
  };
}
```

## File Type Restrictions

### Validate File Type

```javascript
class FileValidator {
  static allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
    document: ['application/pdf', 'application/msword', 
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    code: ['text/plain', 'text/javascript', 'text/css', 'text/html',
           'application/json', 'application/xml']
  };
  
  static maxSizes = {
    image: 10 * 1024 * 1024,      // 10MB
    video: 100 * 1024 * 1024,     // 100MB
    audio: 50 * 1024 * 1024,      // 50MB
    document: 25 * 1024 * 1024,   // 25MB
    code: 5 * 1024 * 1024,         // 5MB
    default: 100 * 1024 * 1024    // 100MB
  };
  
  static validate(filePath, category) {
    const stats = fs.statSync(filePath);
    const mimeType = this.getMimeType(filePath);
    
    // Check file type
    if (category && this.allowedTypes[category]) {
      if (!this.allowedTypes[category].includes(mimeType)) {
        throw new Error(`File type ${mimeType} not allowed for ${category}`);
      }
    }
    
    // Check file size
    const maxSize = this.maxSizes[category] || this.maxSizes.default;
    if (stats.size > maxSize) {
      throw new Error(`File size exceeds maximum of ${maxSize} bytes`);
    }
    
    return true;
  }
  
  static getMimeType(filePath) {
    const mime = require('mime-types');
    return mime.lookup(filePath) || 'application/octet-stream';
  }
}
```

## Chunked Upload for Large Files

```javascript
class ChunkedUpload {
  constructor(roomId, filePath, chunkSize = 1024 * 1024) { // 1MB chunks
    this.roomId = roomId;
    this.filePath = filePath;
    this.chunkSize = chunkSize;
    this.fileSize = fs.statSync(filePath).size;
    this.chunks = Math.ceil(this.fileSize / chunkSize);
  }
  
  async upload() {
    const uploadId = await this.initializeUpload();
    
    for (let i = 0; i < this.chunks; i++) {
      await this.uploadChunk(uploadId, i);
    }
    
    return this.completeUpload(uploadId);
  }
  
  async initializeUpload() {
    // Initialize multipart upload
    const response = await fetch(`${baseUrl}/api/v1/rooms.upload.init`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomId: this.roomId,
        fileName: path.basename(this.filePath),
        fileSize: this.fileSize
      })
    });
    
    const data = await response.json();
    return data.uploadId;
  }
  
  async uploadChunk(uploadId, chunkIndex) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.fileSize);
    
    const chunk = fs.createReadStream(this.filePath, { start, end: end - 1 });
    
    const form = new FormData();
    form.append('chunk', chunk);
    form.append('uploadId', uploadId);
    form.append('chunkIndex', chunkIndex);
    
    const response = await fetch(`${baseUrl}/api/v1/rooms.upload.chunk`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
        ...form.getHeaders()
      },
      body: form
    });
    
    return response.json();
  }
  
  async completeUpload(uploadId) {
    const response = await fetch(`${baseUrl}/api/v1/rooms.upload.complete`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': authToken,
        'X-User-Id': userId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uploadId })
    });
    
    return response.json();
  }
}
```

## File Storage Backends

### GridFS Configuration

```javascript
// MongoDB GridFS storage (default)
{
  "FileUpload_Storage_Type": "GridFS",
  "FileUpload_GridFS_Bucket": "rocketchat_uploads"
}
```

### FileSystem Configuration

```javascript
// Local filesystem storage
{
  "FileUpload_Storage_Type": "FileSystem",
  "FileUpload_FileSystemPath": "/var/rocket.chat/uploads",
  "FileUpload_FileSystem_URL_Prefix": "/uploads"
}
```

### S3 Configuration

```javascript
// Amazon S3 or S3-compatible storage
{
  "FileUpload_Storage_Type": "AmazonS3",
  "FileUpload_S3_Bucket": "rocketchat-uploads",
  "FileUpload_S3_Region": "us-east-1",
  "FileUpload_S3_AccessKey": "access-key",
  "FileUpload_S3_SecretKey": "secret-key",
  "FileUpload_S3_CDN": "https://cdn.example.com",
  "FileUpload_S3_BucketURL": "https://s3.amazonaws.com/rocketchat-uploads"
}
```

## Security Considerations

### Virus Scanning

```javascript
const NodeClam = require('clamscan');

class VirusScanner {
  constructor() {
    this.clamscan = new NodeClam().init({
      clamdscan: {
        host: '127.0.0.1',
        port: 3310
      }
    });
  }
  
  async scanFile(filePath) {
    const { isInfected, file, viruses } = await this.clamscan.scanFile(filePath);
    
    if (isInfected) {
      throw new Error(`File contains virus: ${viruses.join(', ')}`);
    }
    
    return { safe: true, file };
  }
  
  async scanBeforeUpload(roomId, filePath) {
    await this.scanFile(filePath);
    // Proceed with upload if safe
    return uploadFile(roomId, filePath);
  }
}
```

### Content Type Validation

```javascript
const fileType = require('file-type');

async function validateContentType(filePath) {
  const type = await fileType.fromFile(filePath);
  
  if (!type) {
    throw new Error('Unable to determine file type');
  }
  
  // Verify extension matches content
  const ext = path.extname(filePath).toLowerCase().slice(1);
  if (ext !== type.ext) {
    throw new Error(`File extension (${ext}) doesn't match content type (${type.ext})`);
  }
  
  return type;
}
```

### Sanitize Filenames

```javascript
function sanitizeFilename(filename) {
  // Remove path traversal attempts
  filename = path.basename(filename);
  
  // Remove special characters
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  const maxLength = 255;
  if (filename.length > maxLength) {
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    filename = name.substring(0, maxLength - ext.length) + ext;
  }
  
  return filename;
}
```

## Error Handling

### Upload Error Recovery

```javascript
class UploadManager {
  async uploadWithRetry(roomId, filePath, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.upload(roomId, filePath);
      } catch (error) {
        lastError = error;
        
        if (error.message.includes('File is too large')) {
          // Don't retry for size errors
          throw error;
        }
        
        if (error.message.includes('Invalid file type')) {
          // Don't retry for type errors
          throw error;
        }
        
        // Exponential backoff for other errors
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Upload failed (attempt ${attempt}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```