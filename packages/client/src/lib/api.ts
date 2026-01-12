// packages/client/src/lib/api.ts
const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  auth: {
    anonymous: () => request<{ token: string; displayName: string; sessionId: string }>('/auth/anonymous', { method: 'POST' }),
    me: () => request<{ sessionId: string; displayName: string; userId: string | null }>('/auth/me'),
  },
  images: {
    list: () => request<Array<{ id: string; url: string; name: string; width: number; height: number }>>('/images'),
    get: (id: string) => request<{ id: string; url: string; name: string; width: number; height: number }>(`/images/${id}`),
  },
  games: {
    list: () =>
      request<
        Array<{
          id: string;
          urlSlug: string;
          pieceCount: number;
          imageName: string;
          imageUrl: string;
          createdAt: string;
          playerCount: number;
        }>
      >('/games'),
    create: (data: { imageId: string; pieceCount: number; tileType: string }) =>
      request<{ id: string; urlSlug: string; pieceCount: number; imageUrl: string }>('/games', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (slug: string) =>
      request<{ success: boolean }>(`/games/${slug}`, { method: 'DELETE' }),
    get: (slug: string) =>
      request<{
        id: string;
        urlSlug: string;
        pieceCount: number;
        tileType: string;
        imageUrl: string;
        imageWidth: number;
        imageHeight: number;
        status: string;
        isAdmin: boolean;
      }>(`/games/${slug}`),
    getStencil: (slug: string) => request<any>(`/games/${slug}/stencil`),
    getState: (slug: string) => request<any>(`/games/${slug}/state`),
  },
};
