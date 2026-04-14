// src/services/compression.js
// Native media compression using expo-image-manipulator (images) and expo-av (video info).
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { COMPRESSION_CONFIG } from '../constants';

export function isCompressibleMedia(mimeType) {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/');
}

export function isImage(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

export function isVideo(mimeType) {
  return mimeType && mimeType.startsWith('video/');
}

export function isAudio(mimeType) {
  return mimeType && mimeType.startsWith('audio/');
}

export async function compressMedia(uri, mimeType, onProgress) {
  if (isImage(mimeType)) {
    return compressImage(uri, onProgress);
  }

  // Video/audio: return as-is for now.
  // react-native-compressor or ffmpeg-kit can be added later for native video compression.
  // Unlike browser WASM, these use hardware codecs and work fast.
  if (onProgress) onProgress(100);
  return { uri, compressed: false };
}

async function compressImage(uri, onProgress) {
  const { IMAGE_MAX_DIMENSION, IMAGE_QUALITY } = COMPRESSION_CONFIG;

  try {
    if (onProgress) onProgress(10);

    const originalInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = originalInfo.size || 0;

    if (onProgress) onProgress(30);

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_MAX_DIMENSION } }],
      { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );

    if (onProgress) onProgress(80);

    const compressedInfo = await FileSystem.getInfoAsync(result.uri);
    const compressedSize = compressedInfo.size || 0;

    if (onProgress) onProgress(100);

    // If compressed is larger, return original
    if (compressedSize >= originalSize && originalSize > 0) {
      return { uri, compressed: false, originalSize, compressedSize: originalSize };
    }

    const reduction = originalSize > 0
      ? Math.round((1 - compressedSize / originalSize) * 100)
      : 0;

    console.info(`Image compressed: ${originalSize} → ${compressedSize} (${reduction}% reduction)`);

    return {
      uri: result.uri,
      compressed: true,
      originalSize,
      compressedSize,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.warn('Image compression failed:', error.message);
    if (onProgress) onProgress(100);
    return { uri, compressed: false };
  }
}

export async function getFileInfo(uri) {
  const info = await FileSystem.getInfoAsync(uri);
  return {
    uri,
    size: info.size || 0,
    exists: info.exists,
  };
}
