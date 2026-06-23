import { useEffect, useState } from 'react';

interface GeoInfo {
  countryCode: string | null;
  language: string | null;
  loading: boolean;
}

// Session-level cache — avoids repeated API calls within the same tab session
let _cachedGeo: GeoInfo | null = null;

export function useGeo(): GeoInfo {
  const [geo, setGeo] = useState<GeoInfo>(
    _cachedGeo ?? { countryCode: null, language: null, loading: true }
  );

  useEffect(() => {
    // Return early if already fetched (cached in module scope)
    if (_cachedGeo && !_cachedGeo.loading) return;

    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/geo`)
      .then((r) => r.json())
      .then((data: { data: { countryCode: string | null; language: string | null } }) => {
        if (cancelled) return;
        const result: GeoInfo = { countryCode: data.data.countryCode, language: data.data.language, loading: false };
        _cachedGeo = result;
        setGeo(result);
      })
      .catch(() => {
        if (!cancelled) {
          const result: GeoInfo = { countryCode: null, language: null, loading: false };
          _cachedGeo = result;
          setGeo(result);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return geo;
}
