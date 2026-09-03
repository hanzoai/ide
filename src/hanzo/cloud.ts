// The cloud's one address. VITE_HANZO_API_URL points it at a cloud on the LAN;
// unset, it is the platform.
export const api = import.meta.env.VITE_HANZO_API_URL ?? 'https://api.hanzo.ai'
