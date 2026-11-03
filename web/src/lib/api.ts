let base = import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : '';
if (base) {
  base = base.trim();
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  if (!base.startsWith('http://') && !base.startsWith('https://') && !base.startsWith('/')) {
    // If it's a hostname without a domain like 'love-video-api', in browser context it must point to the onrender domain
    if (!base.includes('.')) {
      base = `https://${base}.onrender.com`;
    } else {
      base = `https://${base}`;
    }
  }
}
const API_BASE_URL = base;

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
