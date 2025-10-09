// Utility to load frame config JSON dynamically
export async function loadFrameConfig(frameId) {
  // Convention: file name = frameId + .json
  const path = `/frames/${frameId}.json`;
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Frame config not found');
    return await response.json();
  } catch (e) {
    console.error('Failed to load frame config:', e);
    return null;
  }
}
