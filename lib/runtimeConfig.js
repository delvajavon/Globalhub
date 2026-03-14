const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1']);

export function getBackendUrl() {
  const configured = (import.meta.env.VITE_BACKEND_URL || '').trim();
  if (configured) {
    return configured;
  }

  const protocol = window.location.protocol || 'https:';
  const host = window.location.hostname || 'localhost';

  if (LOCALHOST_NAMES.has(host)) {
    return `${protocol}//${host}:3001`;
  }

  // In hosted environments default to same-origin API routes (Vercel-only setup).
  return '';
}

export function getClerkPublishableKey() {
  return (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();
}
