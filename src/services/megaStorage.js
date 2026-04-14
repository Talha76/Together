import { Storage, File as MegaFile } from 'megajs';
import { megaConfig } from './config';
import { Buffer } from 'buffer';

function base64ToUint8Array(base64) {
  const base64String = base64.includes(',') ? base64.split(',')[1] : base64;
  return new Uint8Array(Buffer.from(base64String, 'base64'));
}

function uint8ArrayToBase64(buffer) {
  return Buffer.from(new Uint8Array(buffer)).toString('base64');
}

export class MegaStorage {
  constructor() {
    this.storage = null;
    this.isReady = false;
  }

  async ensureReady() {
    if (this.isReady && this.storage) return this.storage;

    try {
      this.storage = new Storage(megaConfig);

      if (this.storage.ready && typeof this.storage.ready.then === 'function') {
        await this.storage.ready;
      } else {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Storage initialization timeout')), 10000);
          this.storage.on('ready', () => { clearTimeout(timeout); resolve(); });
          this.storage.on('error', (error) => { clearTimeout(timeout); reject(error); });
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
      if (abortSignal?.aborted) throw new Error('Upload cancelled');
      const storage = await this.ensureReady();
      if (abortSignal?.aborted) throw new Error('Upload cancelled');

      const uint8Array = base64ToUint8Array(encryptedData);
      if (abortSignal?.aborted) throw new Error('Upload cancelled');

      uploadStream = storage.upload({ name: fileName, size: uint8Array.length });

      const abortHandler = () => {
        if (aborted) return;
        aborted = true;
        if (uploadStream) {
          if (progressHandler) uploadStream.off('progress', progressHandler);
          if (completeHandler) uploadStream.off('complete', completeHandler);
          if (errorHandler) uploadStream.off('error', errorHandler);
          if (closeHandler) uploadStream.off('close', closeHandler);
          try { uploadStream.destroy(); } catch {}
        }
      };

      if (abortSignal) abortSignal.addEventListener('abort', abortHandler);

      progressHandler = (stats) => {
        if (aborted || abortSignal?.aborted) { abortHandler(); return; }
        if (onProgress) onProgress(Math.round((stats.bytesUploaded / stats.bytesTotal) * 100));
      };
      uploadStream.on('progress', progressHandler);

      if (aborted || abortSignal?.aborted) { abortHandler(); throw new Error('Upload cancelled'); }

      uploadStream.write(uint8Array);
      uploadStream.end();

      const file = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { abortHandler(); reject(new Error('Upload timeout')); }, 10 * 60 * 1000);
        completeHandler = (f) => { clearTimeout(timeout); if (aborted || abortSignal?.aborted) reject(new Error('Upload cancelled')); else resolve(f); };
        uploadStream.on('complete', completeHandler);
        errorHandler = (err) => { clearTimeout(timeout); reject(aborted ? new Error('Upload cancelled') : err); };
        uploadStream.on('error', errorHandler);
        closeHandler = () => { clearTimeout(timeout); if (aborted || abortSignal?.aborted) reject(new Error('Upload cancelled')); };
        uploadStream.on('close', closeHandler);
      });

      if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);
      if (aborted || abortSignal?.aborted) throw new Error('Upload cancelled');

      const link = await file.link();
      return { success: true, link, size: uint8Array.length };
    } catch (error) {
      if (uploadStream) {
        try {
          if (progressHandler) uploadStream.off('progress', progressHandler);
          if (completeHandler) uploadStream.off('complete', completeHandler);
          if (errorHandler) uploadStream.off('error', errorHandler);
          if (closeHandler) uploadStream.off('close', closeHandler);
          uploadStream.destroy();
        } catch {}
      }
      if (error.message === 'Upload cancelled' || abortSignal?.aborted) {
        return { success: false, cancelled: true, error: 'Upload cancelled' };
      }
      return { success: false, error: error.message || 'Upload failed' };
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
      if (abortSignal?.aborted) throw new Error('Download cancelled');

      const file = MegaFile.fromURL(megaLink);
      await file.loadAttributes();
      if (abortSignal?.aborted) throw new Error('Download cancelled');

      const totalSize = file.size;
      const chunks = [];
      let downloadedBytes = 0;

      downloadStream = file.download();

      const abortHandler = () => {
        if (aborted) return;
        aborted = true;
        if (downloadStream) {
          if (dataHandler) downloadStream.off('data', dataHandler);
          if (endHandler) downloadStream.off('end', endHandler);
          if (errorHandler) downloadStream.off('error', errorHandler);
          if (closeHandler) downloadStream.off('close', closeHandler);
          try { downloadStream.destroy(); } catch {}
        }
      };

      if (abortSignal) abortSignal.addEventListener('abort', abortHandler);

      dataHandler = (chunk) => {
        if (aborted || abortSignal?.aborted) { abortHandler(); return; }
        chunks.push(chunk);
        downloadedBytes += chunk.length;
        if (onProgress) onProgress(Math.round((downloadedBytes / totalSize) * 100));
      };
      downloadStream.on('data', dataHandler);

      const buffer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { abortHandler(); reject(new Error('Download timeout')); }, 10 * 60 * 1000);
        endHandler = () => {
          clearTimeout(timeout);
          if (aborted || abortSignal?.aborted) { reject(new Error('Download cancelled')); return; }
          const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const c of chunks) { combined.set(c, offset); offset += c.length; }
          resolve(combined);
        };
        downloadStream.on('end', endHandler);
        errorHandler = (err) => { clearTimeout(timeout); reject(aborted ? new Error('Download cancelled') : err); };
        downloadStream.on('error', errorHandler);
        closeHandler = () => { clearTimeout(timeout); if (aborted || abortSignal?.aborted) reject(new Error('Download cancelled')); };
        downloadStream.on('close', closeHandler);
      });

      if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);

      return { success: true, data: uint8ArrayToBase64(buffer), size: buffer.length };
    } catch (error) {
      if (downloadStream) {
        try {
          if (dataHandler) downloadStream.off('data', dataHandler);
          if (endHandler) downloadStream.off('end', endHandler);
          if (errorHandler) downloadStream.off('error', errorHandler);
          if (closeHandler) downloadStream.off('close', closeHandler);
          downloadStream.destroy();
        } catch {}
      }
      if (error.message === 'Download cancelled' || abortSignal?.aborted) {
        return { success: false, cancelled: true, error: 'Download cancelled' };
      }
      return { success: false, error: error.message || 'Download failed' };
    }
  }
}

export const megaStorage = new MegaStorage();
