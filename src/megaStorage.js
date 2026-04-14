// src/megaStorage.js
import { Storage, File as MegaFile } from 'megajs';
import { megaConfig } from './config';

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

    try {
      // Create storage
      this.storage = new Storage(megaConfig);

      // Wait for storage.ready promise (if it exists)
      if (this.storage.ready && typeof this.storage.ready.then === 'function') {
        await this.storage.ready;
      } else {
        // Fallback: wait for ready event
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Storage initialization timeout'));
          }, 10000);

          this.storage.on('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.storage.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      this.isReady = true;

      return this.storage;
    } catch (error) {
      this.isReady = false;
      this.storage = null;
      throw error;
    }
  }

  async uploadFile(encryptedData, fileName, onProgress, abortSignal) {
    let uploadStream = null;
    let aborted = false;
    let progressHandler = null;
    let completeHandler = null;
    let errorHandler = null;
    let closeHandler = null;

    try {
      // Check if already aborted
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Ensure storage is ready
      const storage = await this.ensureReady();

      // Check if aborted after storage ready
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Convert base64 to Uint8Array
      const uint8Array = base64ToArrayBuffer(encryptedData);

      // Check if aborted before starting upload
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Create upload options
      const uploadOptions = {
        name: fileName,
        size: uint8Array.length,
      };

      uploadStream = storage.upload(uploadOptions);

      // Set up abort handler
      const abortHandler = () => {
        if (aborted) return; // Already aborted
        aborted = true;

        // Remove all event listeners immediately
        if (uploadStream) {
          if (progressHandler) uploadStream.off('progress', progressHandler);
          if (completeHandler) uploadStream.off('complete', completeHandler);
          if (errorHandler) uploadStream.off('error', errorHandler);
          if (closeHandler) uploadStream.off('close', closeHandler);

          try {
            uploadStream.destroy();
          } catch (e) {
            // Cleanup error, ignore
          }
        }
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortHandler);
      }

      // Set up progress tracking
      progressHandler = (stats) => {
        if (aborted || abortSignal?.aborted) {
          abortHandler();
          return;
        }

        const progress = (stats.bytesUploaded / stats.bytesTotal) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      };
      uploadStream.on('progress', progressHandler);

      // Check before writing
      if (aborted || abortSignal?.aborted) {
        abortHandler();
        throw new Error('Upload cancelled');
      }

      uploadStream.write(uint8Array);
      uploadStream.end();

      // Wait for upload to complete
      const file = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (uploadStream) {
            abortHandler();
          }
          reject(new Error('Upload timeout after 10 minutes'));
        }, 10 * 60 * 1000);

        completeHandler = (completedFile) => {
          clearTimeout(timeout);

          // Check if aborted right before completion
          if (aborted || abortSignal?.aborted) {
            reject(new Error('Upload cancelled'));
            return;
          }

          resolve(completedFile);
        };
        uploadStream.on('complete', completeHandler);

        errorHandler = (error) => {
          clearTimeout(timeout);

          if (aborted || abortSignal?.aborted) {
            reject(new Error('Upload cancelled'));
          } else {
            reject(error);
          }
        };
        uploadStream.on('error', errorHandler);

        closeHandler = () => {
          clearTimeout(timeout);

          if (aborted || abortSignal?.aborted) {
            reject(new Error('Upload cancelled'));
          }
        };
        uploadStream.on('close', closeHandler);
      });

      // Remove abort listener
      if (abortSignal) {
        abortSignal.removeEventListener('abort', abortHandler);
      }

      // Final check before generating link
      if (aborted || abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Get shareable link
      const link = await file.link();

      return {
        success: true,
        link,
        size: uint8Array.length,
      };
    } catch (error) {
      // Cleanup: remove all listeners and destroy stream
      if (uploadStream) {
        try {
          if (progressHandler) uploadStream.off('progress', progressHandler);
          if (completeHandler) uploadStream.off('complete', completeHandler);
          if (errorHandler) uploadStream.off('error', errorHandler);
          if (closeHandler) uploadStream.off('close', closeHandler);
          uploadStream.destroy();
        } catch (e) {
          // Cleanup error, ignore
        }
      }

      // Check if it was a cancellation
      if (error.message === 'Upload cancelled' || abortSignal?.aborted) {
        return {
          success: false,
          cancelled: true,
          error: 'Upload cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  async downloadFile(megaLink, onProgress, abortSignal) {
    let downloadStream = null;
    let aborted = false;
    let dataHandler = null;
    let endHandler = null;
    let errorHandler = null;
    let closeHandler = null;

    try {
      // Check if already aborted
      if (abortSignal?.aborted) {
        throw new Error('Download cancelled');
      }

      // Parse the Mega link
      const file = MegaFile.fromURL(megaLink);

      await file.loadAttributes();

      // Check if aborted after loading attributes
      if (abortSignal?.aborted) {
        throw new Error('Download cancelled');
      }

      const totalSize = file.size;

      const chunks = [];
      let downloadedBytes = 0;

      // Start download stream
      downloadStream = file.download();

      // Set up abort handler
      const abortHandler = () => {
        if (aborted) return;
        aborted = true;

        if (downloadStream) {
          // Remove listeners before destroying
          if (dataHandler) downloadStream.off('data', dataHandler);
          if (endHandler) downloadStream.off('end', endHandler);
          if (errorHandler) downloadStream.off('error', errorHandler);
          if (closeHandler) downloadStream.off('close', closeHandler);

          try {
            downloadStream.destroy();
          } catch (e) {
            // Cleanup error, ignore
          }
        }
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortHandler);
      }

      // Collect chunks
      dataHandler = (chunk) => {
        if (aborted || abortSignal?.aborted) {
          abortHandler();
          return;
        }

        chunks.push(chunk);
        downloadedBytes += chunk.length;

        const progress = (downloadedBytes / totalSize) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      };

      downloadStream.on('data', dataHandler);

      // Wait for download to complete
      const buffer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (downloadStream) {
            abortHandler();
          }
          reject(new Error('Download timeout after 10 minutes'));
        }, 10 * 60 * 1000);

        endHandler = () => {
          clearTimeout(timeout);

          if (aborted || abortSignal?.aborted) {
            reject(new Error('Download cancelled'));
            return;
          }

          // Combine all chunks into single buffer
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;

          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }

          resolve(combined);
        };
        downloadStream.on('end', endHandler);

        errorHandler = (error) => {
          clearTimeout(timeout);

          if (aborted || abortSignal?.aborted) {
            reject(new Error('Download cancelled'));
          } else {
            reject(error);
          }
        };
        downloadStream.on('error', errorHandler);

        closeHandler = () => {
          clearTimeout(timeout);

          if (aborted || abortSignal?.aborted) {
            reject(new Error('Download cancelled'));
          }
        };
        downloadStream.on('close', closeHandler);
      });

      // Remove abort listener
      if (abortSignal) {
        abortSignal.removeEventListener('abort', abortHandler);
      }

      // Convert to base64
      const base64Data = arrayBufferToBase64(buffer);

      return {
        success: true,
        data: base64Data,
        size: buffer.length,
      };
    } catch (error) {
      // Cleanup
      if (downloadStream) {
        try {
          if (dataHandler) downloadStream.off('data', dataHandler);
          if (endHandler) downloadStream.off('end', endHandler);
          if (errorHandler) downloadStream.off('error', errorHandler);
          if (closeHandler) downloadStream.off('close', closeHandler);
          downloadStream.destroy();
        } catch (e) {
          // Cleanup error, ignore
        }
      }

      // Check if it was a cancellation
      if (error.message === 'Download cancelled' || abortSignal?.aborted) {
        return {
          success: false,
          cancelled: true,
          error: 'Download cancelled',
        };
      }

      return {
        success: false,
        error: error.message || 'Download failed',
      };
    }
  }
}

// Export singleton instance
export const megaStorage = new MegaStorage();
