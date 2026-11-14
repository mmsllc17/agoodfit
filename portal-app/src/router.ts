import { useEffect, useState } from 'react';

/** Current hash path, e.g. "/events/ev_1". Defaults to "/overview". */
function current() {
  const h = window.location.hash.replace(/^#/, '');
  return h && h !== '/' ? h : '/overview';
}

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => {
      setPath(current());
      window.scrollTo(0, 0);
      document.querySelector('main')?.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function go(path: string) {
  window.location.hash = path;
}

/** Match "/events/:id" style patterns. Returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('?')[0].split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) out[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return out;
}
