import { useEffect, useState } from 'react';

interface GeoInfo {
  countryCode: string | null;
  language: string | null;
  loading: boolean;
}

const STORAGE_KEY = 'mo_geo';

export function useGeo(): GeoInfo {
  const [geo, setGeo] = useState<GeoInfo>({ countryCode: null, language: null, loading: true });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setGeo({ ...parsed, loading: false });
        return;
      } catch { /* invalid stored data */ }
    }

    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/geo`)
      .then((r) => r.json())
      .then((data: { data: { countryCode: string | null; language: string | null } }) => {
        if (cancelled) return;
        const result = {
          countryCode: data.data.countryCode,
          language: data.data.language,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        setGeo({ ...result, loading: false });
      })
      .catch(() => {
        if (!cancelled) setGeo({ countryCode: null, language: null, loading: false });
      });

    return () => { cancelled = true; };
  }, []);

  return geo;
}
