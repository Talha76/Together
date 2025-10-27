// src/megaStorage.js
import { Storage, File as MegaFile } from 'megajs';

// Browser-compatible base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Browser-compatible ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class MegaStorage {
  constructor() {
    this.storage = null;
  }

  async uploadFile(encryptedData, fileName, onProgress) {
    try {
      console.log('📤 Uploading to Mega.nz:', fileName);

      // Convert base64 to ArrayBuffer
      const buffer = base64ToArrayBuffer(encryptedData);
      
      // Get storage instance
      const storage = await this.getStorage();
      
      // Create upload stream
      const uploadStream = storage.upload({
        name: fileName,
        size: buffer.byteLength,
      });

      // Track progress
      let uploadedBytes = 0;
      uploadStream.on('progress', (stats) => {
        uploadedBytes = stats.bytesUploaded;
        const progress = (uploadedBytes / buffer.byteLength) * 100;
        if (onProgress) onProgress(Math.round(progress));
        console.log(`Upload progress: ${Math.round(progress)}%`);
      });

      // Upload the buffer
      const uint8Array = new Uint8Array(buffer);
      uploadStream.write(uint8Array);
      uploadStream.end();

      // Wait for completion
      const file = await new Promise((resolve, reject) => {
        uploadStream.on('complete', resolve);
        uploadStream.on('error', reject);
      });

      // Get shareable link
      const link = await file.link();
      
      console.log('✅ Upload complete:', link);
      
      return {
        success: true,
        link,
        size: buffer.byteLength,
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async downloadFile(megaLink, onProgress) {
    try {
      console.log('📥 Downloading from Mega.nz:', megaLink);

      // Parse Mega link
      const file = MegaFile.fromURL(megaLink);
      
      // Load file attributes
      await file.loadAttributes();
      
      const chunks = [];
      let downloadedBytes = 0;
      const totalSize = file.size;

      console.log('File size:', totalSize, 'bytes');

      // Start download
      const stream = file.download();

      // Collect chunks
      stream.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedBytes += chunk.length;
        
        const progress = (downloadedBytes / totalSize) * 100;
        if (onProgress) onProgress(Math.round(progress));
        console.log(`Download progress: ${Math.round(progress)}%`);
      });

      // Wait for completion
      const buffer = await new Promise((resolve, reject) => {
        stream.on('end', () => {
          // Combine all chunks
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          resolve(combined.buffer);
        });
        stream.on('error', reject);
      });

      // Convert to base64
      const base64Data = arrayBufferToBase64(buffer);
      
      console.log('✅ Download complete');
      
      return {
        success: true,
        data: base64Data,
        size: buffer.byteLength,
      };
    } catch (error) {
      console.error('❌ Download failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getStorage() {
    if (this.storage) return this.storage;

    console.log('🔧 Initializing Mega.nz storage...');
    
    // Create anonymous storage
    this.storage = new Storage();
    
    // For production with dedicated account:
    // this.storage = new Storage({
    //   email: 'your-email@example.com',
    //   password: 'your-password',
    // });
    // await this.storage.ready;

    console.log('✅ Storage initialized');
    
    return this.storage;
  }
}

// Singleton instance
export const megaStorage = new MegaStorage();
