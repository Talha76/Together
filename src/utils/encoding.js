/**
 * Convert Uint8Array to base64 string (avoiding stack overflow for large arrays).
 */
export function uint8ArrayToBase64(uint8Array) {
  const chunkSize = 8192;
  const chunks = [];

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk));
  }

  return btoa(chunks.join(''));
}

/**
 * Convert a base64 string to a Blob.
 */
export function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
