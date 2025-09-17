export const API_BASE = (import.meta as any).env?.VITE_API_BASE || (window as any).__API_BASE__ || '';

export function api(path: string) {
  const base = (API_BASE || '').trim();
  if (base && /^https?:\/\//.test(base)) {
    return base.replace(/\/$/, '') + path;
  }
  return path;
}

export async function get(path: string, init?: RequestInit) {
  const res = await fetch(api(path), { method: 'GET', ...(init||{}) });
  return res;
}
export async function post(path: string, body: any, init?: RequestInit) {
  const res = await fetch(api(path), { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), ...(init||{}) });
  return res;
}
