const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || "/api";
};

export async function getSharedGroup(shareId) {
  const API_URL = getApiUrl();
  const response = await fetch(`${API_URL}/groups/share/${shareId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || "Group not found");
  }
  const data = await response.json();
  return data.group;
}
