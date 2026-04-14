// src/mediaCompression.js
// Image compression via Canvas API (hardware-accelerated, non-blocking).
// Video/audio: no browser-side compression — FFmpeg.wasm blocks main thread
// and is impractically slow. Upload as-is.
import { COMPRESSION_CONFIG } from './constants';

/**
 * Returns true if the file can be compressed client-side.
 * Only images — video/audio compression in browser WASM is too slow.
 */
export function isCompressibleMedia(file) {
  if (!file || !file.type) return false;
  const compressibleTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
  return compressibleTypes.includes(file.type);
}

/**
 * Compress media file. Currently only images via Canvas API.
 *
 * @param {File} file - The input file
 * @param {function} onProgress - Progress callback (0-100)
 * @param {AbortSignal} [abortSignal] - Optional abort signal
 * @returns {Promise<File>} - Compressed file, or original if compression fails or yields larger file
 */
export async function compressMedia(file, onProgress, abortSignal) {
  if (abortSignal?.aborted) throw new Error('Upload cancelled');

  if (!isCompressibleMedia(file)) return file;

  const { IMAGE_MAX_DIMENSION, IMAGE_QUALITY } = COMPRESSION_CONFIG;

  try {
    if (onProgress) onProgress(0);

    const bitmap = await createImageBitmap(file);
    if (abortSignal?.aborted) throw new Error('Upload cancelled');

    if (onProgress) onProgress(20);

    let { width, height } = bitmap;
    if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
      const scale = IMAGE_MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    if (onProgress) onProgress(60);
    if (abortSignal?.aborted) throw new Error('Upload cancelled');

    // Try WebP first, fall back to JPEG
    let blob = await canvas.convertToBlob({ type: 'image/webp', quality: IMAGE_QUALITY });
    let outputType = 'image/webp';
    let ext = '.webp';

    if (blob.type !== 'image/webp') {
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: IMAGE_QUALITY });
      outputType = 'image/jpeg';
      ext = '.jpg';
    }

    if (onProgress) onProgress(90);

    // If compressed is larger, return original
    if (blob.size >= file.size) {
      if (onProgress) onProgress(100);
      return file;
    }

    console.info(`Image compressed: ${file.size} → ${blob.size} (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`);

    const compressed = new File(
      [blob],
      replaceExtension(file.name, ext),
      { type: outputType }
    );

    if (onProgress) onProgress(100);
    return compressed;
  } catch (error) {
    const msg = error?.message || String(error);
    if (msg === 'Upload cancelled') throw error;
    console.warn('Image compression failed, using original:', msg);
    if (onProgress) onProgress(100);
    return file;
  }
}

function replaceExtension(filename, newExt) {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  return base + newExt;
}
