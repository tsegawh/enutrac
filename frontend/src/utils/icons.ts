import L from 'leaflet';

// Create a custom icon for devices
export function createDeviceIcon(isOnline: boolean, options?: { size?: number }) {
  const size = options?.size || 40;

  return L.divIcon({
    html: `<div style="
      background-color: ${isOnline ? '#4ade80' : '#9ca3af'};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid ${isOnline ? '#16a34a' : '#6b7280'};
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
