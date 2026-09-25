import { useEffect, useRef, useState } from "react";

type Coordinates = { lat: number; lng: number };
type YandexMap = { destroy: () => void; geoObjects: { add: (placemark: unknown) => void; removeAll: () => void }; events: { add: (event: string, callback: (event: { get: (key: string) => number[] }) => void) => void } };

declare global {
  interface Window { ymaps?: { ready: (callback: () => void) => void; Map: new (element: HTMLElement, options: object) => YandexMap; Placemark: new (coordinates: number[], options?: object, settings?: object) => unknown } }
}

function loadYandex(key: string) {
  if (window.ymaps) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps?.ready(resolve);
    script.onerror = () => reject(new Error("yandex_maps_unavailable"));
    document.head.append(script);
  });
}

export function YandexLocationPicker({ value, onChange }: { value: Coordinates | null; onChange: (coordinates: Coordinates) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<YandexMap | null>(null);
  const [message, setMessage] = useState("Autorisez votre position, puis cliquez sur la carte pour confirmer l’emplacement.");

  useEffect(() => {
    const key = import.meta.env["VITE_YANDEX_MAPS_API_KEY"];
    if (!key || !container.current) { setMessage("La carte n’est pas configurée."); return; }
    let disposed = false;
    const initial = value ?? { lat: 55.751244, lng: 37.618423 };
    void loadYandex(key).then(() => {
      if (disposed || !container.current || !window.ymaps) return;
      map.current = new window.ymaps.Map(container.current, { center: [initial.lat, initial.lng], zoom: value ? 15 : 10, controls: ["zoomControl"] });
      const setMarker = (lat: number, lng: number) => {
        map.current?.geoObjects.removeAll();
        map.current?.geoObjects.add(new window.ymaps!.Placemark([lat, lng], {}, { draggable: true }));
        onChange({ lat, lng });
      };
      map.current.events.add("click", (event) => {
        const coords = event.get("coords");
        if (coords[0] !== undefined && coords[1] !== undefined) setMarker(coords[0], coords[1]);
      });
      if (value) setMarker(value.lat, value.lng);
      navigator.geolocation?.getCurrentPosition(
        (position) => { if (!disposed) { setMarker(position.coords.latitude, position.coords.longitude); setMessage("Position détectée. Vous pouvez déplacer le marqueur en cliquant sur la carte."); } },
        () => setMessage("Position non disponible. Cliquez sur la carte pour indiquer l’emplacement."),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    }).catch(() => setMessage("La carte est momentanément indisponible."));
    return () => { disposed = true; map.current?.destroy(); map.current = null; };
  }, []);

  return <div className="space-y-2"><div ref={container} className="h-72 w-full overflow-hidden rounded-lg border border-border bg-muted" /><p className="text-xs text-muted-foreground">{message}</p></div>;
}
