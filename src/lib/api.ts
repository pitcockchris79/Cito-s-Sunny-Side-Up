/**
 * Resolves the correct API URL for local development and distributed desktop builds (Tauri).
 * Tauri runs the frontend in a custom protocol (tauri:// or asset://) and does not host
 * the Node/Express server locally inside the binary.
 */
export function getApiUrl(endpoint: string): string {
  const isTauri = typeof window !== 'undefined' && (
    (window as any).__TAURI__ !== undefined || 
    window.location.protocol.startsWith('tauri') || 
    window.location.protocol.startsWith('asset')
  );

  if (isTauri) {
    // In Tauri, route API requests to your deployed live Cloud Run server
    const cloudBase = 'https://ais-pre-bmyr3u6duixafk75g2c3gk-850092276648.us-east1.run.app';
    return `${cloudBase}${endpoint}`;
  }

  // Otherwise, use relative URLs (works for dev server and direct web deployment)
  return endpoint;
}
