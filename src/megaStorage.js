// src/megaStorage.js
import { Storage, File as MegaFile } from 'megajs';
import { megaConfig } from './config';

// // Browser-compatible base64 to ArrayBuffer
// function base64ToArrayBuffer(base64) {
//   const binaryString = atob(base64);
//   const bytes = new Uint8Array(binaryString.length);
//   for (let i = 0; i < binaryString.length; i++) {
//     bytes[i] = binaryString.charCodeAt(i);
//   }
//   return bytes;
// }

// Browser-compatible base64 to ArrayBuffer (optimized)
function base64ToArrayBuffer(base64) {
  // Remove data URL prefix if present
  const base64String = base64.includes(',') ? base64.split(',')[1] : base64;
  
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  // Process in chunks to avoid stack overflow
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const end = Math.min(i + chunkSize, len);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }
  
  return bytes;
}

// Browser-compatible ArrayBuffer to base64 (optimized to avoid stack overflow)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  
  // Process in chunks to avoid stack overflow and string length limits
  const chunkSize = 8192;
  const chunks = [];
  
  for (let i = 0; i < len; i += chunkSize) {
    const end = Math.min(i + chunkSize, len);
    const chunk = bytes.subarray(i, end);
    // Use apply with a chunk to avoid "Maximum call stack size exceeded"
    chunks.push(String.fromCharCode.apply(null, chunk));
  }
  
  const binary = chunks.join('');
  return btoa(binary);
}

export class MegaStorage {
  constructor() {
    this.storage = null;
    this.isReady = false;
  }

  async ensureReady() {
    if (this.isReady && this.storage) {
      return this.storage;
    }

    console.log('🔧 Initializing Mega.nz storage...');

    try {
      // Create storage
      this.storage = new Storage(megaConfig);
      
      // Wait for storage.ready promise (if it exists)
      if (this.storage.ready && typeof this.storage.ready.then === 'function') {
        console.log('⏳ Waiting for storage.ready promise...');
        await this.storage.ready;
        console.log('✅ Storage ready promise resolved');
      } else {
        // Fallback: wait for ready event
        console.log('⏳ Waiting for ready event...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Storage initialization timeout'));
          }, 10000);

          this.storage.on('ready', () => {
            clearTimeout(timeout);
            console.log('✅ Ready event fired');
            resolve();
          });

          this.storage.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }
      
      this.isReady = true;
      console.log('✅ Mega storage fully ready');
      
      return this.storage;
    } catch (error) {
      console.error('❌ Mega initialization failed:', error);
      this.isReady = false;
      this.storage = null;
      throw error;
    }
  }

  async uploadFile(encryptedData, fileName, onProgress) {
    try {
      console.log('📤 Starting upload to Mega.nz:', fileName);

      // Ensure storage is ready
      const storage = await this.ensureReady();

      // Convert base64 to Uint8Array
      const uint8Array = base64ToArrayBuffer(encryptedData);
      
      console.log('📦 File size:', uint8Array.length, 'bytes');

      // Create upload options
      const uploadOptions = {
        name: fileName,
        size: uint8Array.length,
        // uploadCiphertext: true, // Upload raw data without Mega's encryption
      };

      console.log('🚀 Creating upload stream...');
      const uploadStream = storage.upload(uploadOptions);

      // Set up progress tracking
      uploadStream.on('progress', (stats) => {
        const progress = (stats.bytesUploaded / stats.bytesTotal) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
        console.log(`📊 Upload: ${Math.round(progress)}%`);
      });

      // Write the data
      console.log('✍️ Writing data...');
      uploadStream.write(uint8Array);
      uploadStream.end();

      // Wait for upload to complete
      const file = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Upload timeout after 10 minutes'));
        }, 10 * 60 * 1000);

        uploadStream.on('complete', (completedFile) => {
          clearTimeout(timeout);
          console.log('✅ Upload complete!');
          resolve(completedFile);
        });

        uploadStream.on('error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Upload error:', error);
          reject(error);
        });
      });

      // Get shareable link
      console.log('🔗 Generating share link...');
      const link = await file.link();
      
      console.log('✅ File uploaded successfully:', link);
      
      return {
        success: true,
        link,
        size: uint8Array.length,
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  async downloadFile(megaLink, onProgress) {
    try {
      console.log('📥 Starting download from Mega.nz:', megaLink);

      // Parse the Mega link
      const file = MegaFile.fromURL(megaLink);
      
      console.log('📋 Loading file attributes...');
      await file.loadAttributes();
      
      const totalSize = file.size;
      console.log('📦 File size:', totalSize, 'bytes');

      const chunks = [];
      let downloadedBytes = 0;

      // Start download stream
      console.log('🌊 Starting download stream...');
      const stream = file.download();

      // Collect chunks
      stream.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedBytes += chunk.length;
        
        const progress = (downloadedBytes / totalSize) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
        console.log(`📊 Download: ${Math.round(progress)}%`);
      });

      // Wait for download to complete
      const buffer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Download timeout after 10 minutes'));
        }, 10 * 60 * 1000);

        stream.on('end', () => {
          clearTimeout(timeout);
          console.log('✅ Download stream complete');
          
          // Combine all chunks into single buffer
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          resolve(combined);
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Download stream error:', error);
          reject(error);
        });
      });

      // Convert to base64
      console.log('🔄 Converting to base64...');
      const base64Data = arrayBufferToBase64(buffer);
      
      console.log('✅ Download complete!');
      
      return {
        success: true,
        data: base64Data,
        size: buffer.length,
      };
    } catch (error) {
      console.error('❌ Download failed:', error);
      return {
        success: false,
        error: error.message || 'Download failed',
      };
    }
  }
}

// Export singleton instance
export const megaStorage = new MegaStorage();
