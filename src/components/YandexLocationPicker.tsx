import { Loader2, LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/LanguageProvider";

type Coordinates = { lat: number; lng: number };
type YandexEvent = { get: (key: string) => number[] };
type YandexPlacemark = {
  events: { add: (event: string, callback: () => void) => void };
  geometry: { getCoordinates: () => number[] };
};
type YandexMap = {
  destroy: () => void;
  geoObjects: { add: (placemark: unknown) => void; removeAll: () => void };
  events: { add: (event: string, callback: (event: YandexEvent) => void) => void };
  setCenter: (coordinates: number[], zoom?: number) => void;
};

declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void;
      Map: new (element: HTMLElement, options: object) => YandexMap;
      Placemark: new (
        coordinates: number[],
        options?: object,
        settings?: object,
      ) => YandexPlacemark;
    };
  }
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

function isCoordinates(value: number[]): value is [number, number] {
  return Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

export function YandexLocationPicker({
  value,
  onChange,
}: {
  value: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
}) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<YandexMap | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const placeMarkerRef = useRef<((lat: number, lng: number, centerMap?: boolean) => void) | null>(
    null,
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState(() => t("map.loading"));
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    const key = import.meta.env["VITE_YANDEX_MAPS_API_KEY"];
    if (!key || !container.current) {
      setMessage(t("map.notConfigured"));
      return;
    }
    let disposed = false;
    const initial = valueRef.current ?? { lat: 55.751244, lng: 37.618423 };
    void loadYandex(key)
      .then(() => {
        if (disposed || !container.current || !window.ymaps) return;
        map.current = new window.ymaps.Map(container.current, {
          center: [initial.lat, initial.lng],
          zoom: valueRef.current ? 15 : 10,
          controls: ["zoomControl"],
        });
        const placeMarker = (lat: number, lng: number, centerMap = false) => {
          if (!map.current || !window.ymaps) return;
          map.current.geoObjects.removeAll();
          const marker = new window.ymaps.Placemark([lat, lng], {}, { draggable: true });
          marker.events.add("dragend", () => {
            const coordinates = marker.geometry.getCoordinates();
            if (!isCoordinates(coordinates)) return;
            onChangeRef.current({ lat: coordinates[0], lng: coordinates[1] });
            setMessage(t("map.dragged"));
          });
          map.current.geoObjects.add(marker);
          if (centerMap) map.current.setCenter([lat, lng], 16);
          onChangeRef.current({ lat, lng });
        };
        placeMarkerRef.current = placeMarker;
        map.current.events.add("click", (event) => {
          const coordinates = event.get("coords");
          if (!isCoordinates(coordinates)) return;
          placeMarker(coordinates[0], coordinates[1]);
          setMessage(t("map.selected"));
        });
        if (valueRef.current) {
          placeMarker(valueRef.current.lat, valueRef.current.lng);
          setMessage(t("map.selected"));
        } else setMessage(t("map.choose"));
        setIsMapReady(true);
      })
      .catch(() => setMessage(t("map.unavailable")));
    return () => {
      disposed = true;
      placeMarkerRef.current = null;
      map.current?.destroy();
      map.current = null;
    };
  }, [t]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage(t("map.gpsUnsupported"));
      return;
    }
    setIsLocating(true);
    setMessage(t("map.gpsSearching"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        placeMarkerRef.current?.(position.coords.latitude, position.coords.longitude, true);
        setMessage(t("map.gpsDetected"));
      },
      (error) => {
        setIsLocating(false);
        setMessage(
          error.code === error.PERMISSION_DENIED ? t("map.gpsDenied") : t("map.gpsUnavailable"),
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={container}
        className="h-72 w-full overflow-hidden rounded-lg border border-border bg-muted"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={useCurrentLocation}
        disabled={!isMapReady || isLocating}
      >
        {isLocating ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="size-4" aria-hidden />
        )}
        {t("map.useGps")}
      </Button>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
