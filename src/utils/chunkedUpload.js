import { FILE_LIMITS } from '../constants';

/**
 * Upload large files in chunks with progress tracking
 * Handles unlimited file sizes by streaming chunks
 */
export class ChunkedFileUploader {
  constructor(file, chunkSize = FILE_LIMITS.CHUNK_SIZE) {
    this.file = file;
    this.chunkSize = chunkSize;
    this.totalChunks = Math.ceil(file.size / chunkSize);
    this.uploadedChunks = 0;
  }

  /**
   * Read file in chunks without loading entire file into memory
   */
  async *readFileInChunks() {
    let offset = 0;
    
    while (offset < this.file.size) {
      const chunk = this.file.slice(offset, offset + this.chunkSize);
      const arrayBuffer = await chunk.arrayBuffer();
      
      yield {
        data: new Uint8Array(arrayBuffer),
        chunkIndex: this.uploadedChunks,
        totalChunks: this.totalChunks,
        offset: offset,
        isLastChunk: offset + this.chunkSize >= this.file.size
      };
      
      offset += this.chunkSize;
      this.uploadedChunks++;
    }
  }

  /**
   * Get progress percentage
   */
  getProgress() {
    return Math.round((this.uploadedChunks / this.totalChunks) * 100);
  }

  /**
   * Process entire file in chunks with encryption
   */
  async processFile(encryptionFunction, onProgress) {
    const encryptedChunks = [];
    let totalProcessed = 0;

    for await (const chunk of this.readFileInChunks()) {
      // Encrypt chunk
      const encryptedChunk = encryptionFunction(chunk.data);
      encryptedChunks.push({
        ...encryptedChunk,
        chunkIndex: chunk.chunkIndex,
        isLastChunk: chunk.isLastChunk
      });

      // Update progress
      totalProcessed = chunk.chunkIndex + 1;
      const progress = Math.round((totalProcessed / this.totalChunks) * 100);
      
      if (onProgress) {
        onProgress(progress);
      }

      // Allow UI to update (prevent blocking)
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return {
      chunks: encryptedChunks,
      totalChunks: this.totalChunks,
      originalSize: this.file.size,
      fileName: this.file.name,
      fileType: this.file.type
    };
  }
}

/**
 * Download and decrypt large file in chunks
 */
export class ChunkedFileDownloader {
  constructor(encryptedData, decryptionFunction) {
    this.encryptedData = encryptedData;
    this.decryptionFunction = decryptionFunction;
    this.totalChunks = encryptedData.chunks?.length || 0;
  }

  /**
   * Decrypt and reconstruct file from chunks
   */
  async processChunks(onProgress) {
    const decryptedChunks = [];
    
    for (let i = 0; i < this.totalChunks; i++) {
      const chunk = this.encryptedData.chunks[i];
      
      // Decrypt chunk
      const decryptedData = this.decryptionFunction(chunk);
      decryptedChunks.push(decryptedData);

      // Update progress
      const progress = Math.round(((i + 1) / this.totalChunks) * 100);
      
      if (onProgress) {
        onProgress(progress);
      }

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Combine all decrypted chunks
    const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of decryptedChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return combined;
  }
}

/**
 * Format bytes to human readable with better precision for large files
 */
export const formatLargeFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  const decimals = i > 2 ? 2 : 1; // More precision for GB and above
  
  return value.toFixed(decimals) + ' ' + sizes[i];
};

/**
 * Estimate upload time based on file size and connection speed
 */
export const estimateUploadTime = (fileSize, speedBytesPerSecond = 1024 * 1024) => {
  // Default speed: 1 MB/s (conservative estimate)
  const seconds = fileSize / speedBytesPerSecond;
  
  if (seconds < 60) {
    return `~${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    return `~${Math.ceil(seconds / 60)} minutes`;
  } else {
    return `~${Math.ceil(seconds / 3600)} hours`;
  }
};

/**
 * Check if browser has enough memory for file
 */
export const checkMemoryAvailability = async (fileSize) => {
  // Check if Performance Memory API is available
  if (performance.memory) {
    const usedMemory = performance.memory.usedJSHeapSize;
    const totalMemory = performance.memory.jsHeapSizeLimit;
    const availableMemory = totalMemory - usedMemory;
    
    // Need at least 2x file size for encryption overhead
    const requiredMemory = fileSize * 2;
    
    return {
      hasEnoughMemory: availableMemory > requiredMemory,
      availableMemory,
      requiredMemory,
      warning: availableMemory < requiredMemory ? 
        'Your device may not have enough memory for this file. Upload may be slow or fail.' : 
        null
    };
  }
  
  // If API not available, assume it's okay but warn for very large files
  const GB = 1024 * 1024 * 1024;
  if (fileSize > 2 * GB) {
    return {
      hasEnoughMemory: true,
      warning: 'Large file detected. Upload may take some time.'
    };
  }
  
  return { hasEnoughMemory: true };
};

export default {
  ChunkedFileUploader,
  ChunkedFileDownloader,
  formatLargeFileSize,
  estimateUploadTime,
  checkMemoryAvailability
};
