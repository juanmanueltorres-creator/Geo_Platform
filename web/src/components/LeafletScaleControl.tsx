import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function LeafletScaleControl() {
  const map = useMap();
  useEffect(() => {
    const scale = L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false,
      maxWidth: 120,
    });
    scale.addTo(map);
    return () => {
      scale.remove();
    };
  }, [map]);
  return null;
}
