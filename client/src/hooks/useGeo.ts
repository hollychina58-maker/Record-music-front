import { useEffect, useState } from 'react';

interface GeoInfo {
  countryCode: string | null;
  language: string | null;
  loading: boolean;
}

export function useGeo(): GeoInfo {
  const [geo, setGeo] = useState<GeoInfo>({ countryCode: null, language: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/geo`)
      .then((r) => r.json())
      .then((data: { data: { countryCode: string | null; language: string | null } }) => {
        if (cancelled) return;
        setGeo({ countryCode: data.data.countryCode, language: data.data.language, loading: false });
      })
      .catch(() => {
        if (!cancelled) setGeo({ countryCode: null, language: null, loading: false });
      });

    return () => { cancelled = true; };
  }, []);

  return geo;
}
