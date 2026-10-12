import { useEffect, useState } from 'react';

/**
 * weather — current conditions for a coordinate via Open-Meteo (free, no API
 * key, CORS-enabled). Returns a monochrome-friendly `condition` key that the
 * UI maps to an inline SVG.
 */

const WMO = [
  { max: 0, label: 'Clear', condition: 'clear' },
  { max: 2, label: 'Partly cloudy', condition: 'partly' },
  { max: 3, label: 'Overcast', condition: 'cloudy' },
  { max: 48, label: 'Fog', condition: 'fog' },
  { max: 55, label: 'Drizzle', condition: 'drizzle' },
  { max: 57, label: 'Freezing drizzle', condition: 'drizzle' },
  { max: 65, label: 'Rain', condition: 'rain' },
  { max: 67, label: 'Freezing rain', condition: 'rain' },
  { max: 77, label: 'Snow', condition: 'snow' },
  { max: 82, label: 'Showers', condition: 'showers' },
  { max: 86, label: 'Snow showers', condition: 'snow' },
  { max: 99, label: 'Thunderstorm', condition: 'storm' },
];

export function describeWeather(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return { label: '—', condition: 'unknown' };
  const match = WMO.find((entry) => c <= entry.max);
  return match || { label: '—', condition: 'unknown' };
}

const EMPTY = {
  temperature: null,
  wind: null,
  label: '',
  condition: 'unknown',
  loading: false,
  error: '',
};

export default function useWeather(location) {
  const [state, setState] = useState(EMPTY);

  // Re-fetch only when the user moves ~1 km (2-decimal rounding).
  const key = location ? `${location.lat.toFixed(2)},${location.lng.toFixed(2)}` : null;

  useEffect(() => {
    if (!key) return undefined;
    const [lat, lng] = key.split(',');
    let active = true;

    setState((s) => ({ ...s, loading: true, error: '' }));
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        '&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto'
    )
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const current = data?.current || {};
        const { label, condition } = describeWeather(current.weather_code);
        setState({
          temperature: Math.round(current.temperature_2m),
          wind: Math.round(current.wind_speed_10m),
          label,
          condition,
          loading: false,
          error: '',
        });
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, loading: false, error: 'Weather unavailable' }));
      });

    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
