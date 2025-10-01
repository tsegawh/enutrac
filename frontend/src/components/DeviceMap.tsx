import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Fix default Leaflet markers ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ---------- Types ----------
interface Device {
  id: string;
  name: string;
  uniqueId: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  lastUpdate: string | null;
  isActive?: boolean;           // we’ll use this to ignore inactive
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface DeviceMapStyles {
  onlineColor?: string;
  offlineColor?: string;
  routeColor?: string;
  routeDashArray?: string;
  routeStartColor?: string;
  routeEndColor?: string;
}

interface DeviceMapProps {
  devices: Device[];
  selectedDevice?: Device | null;
  routeData?: RoutePoint[];
  showRoute?: boolean;
  styles?: DeviceMapStyles;
}

// ---------- Helper to determine online/offline ----------
function getDeviceStatus(device: Device) {
  if (!device.isActive) return { online: false, status: 'Inactive' };
  if (!device.lastUpdate) return { online: false, status: 'No Data' };

  const lastUpdate = new Date(device.lastUpdate);
  const minutes = (Date.now() - lastUpdate.getTime()) / (1000 * 60);

  return {
    online: minutes < 10,                         // Online if <10 min
    status: minutes < 10 ? 'Online' : 'Offline',
  };
}

// ---------- Custom marker ----------
const createDeviceIcon = (online: boolean, styles?: DeviceMapStyles) =>
  L.divIcon({
    className: 'custom-device-marker',
    html: `
      <div class="relative">
        <div class="w-8 h-8 rounded-full ${
          online ? styles?.onlineColor ?? 'bg-green-500' : styles?.offlineColor ?? 'bg-gray-400'
        } border-2 border-white shadow-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
        ${
          online
            ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>'
            : ''
        }
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

// ---------- Map controller ----------
function MapController({ devices, selectedDevice, routeData }: DeviceMapProps) {
  const map = useMap();

  useEffect(() => {
    if (routeData && routeData.length > 0) {
      const bounds = L.latLngBounds(routeData.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
      map.setView([selectedDevice.latitude, selectedDevice.longitude], 15);
    } else if (devices.length > 0) {
      const validDevices = devices.filter(d => d.latitude && d.longitude);
      if (validDevices.length > 0) {
        const bounds = L.latLngBounds(validDevices.map(d => [d.latitude!, d.longitude!]));
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, devices, selectedDevice, routeData]);

  return null;
}

// ---------- Main component ----------
export default function DeviceMap({ devices, selectedDevice, routeData, showRoute, styles }: DeviceMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [cachedDevices, setCachedDevices] = useState<Device[]>([]);
  const [cachedRoute, setCachedRoute] = useState<RoutePoint[]>([]);

  // Cache devices & routes in localStorage
  useEffect(() => {
    const dCache = localStorage.getItem('devices');
    const rCache = localStorage.getItem('routeData');
    if (dCache) setCachedDevices(JSON.parse(dCache));
    if (rCache) setCachedRoute(JSON.parse(rCache));

    if (devices && devices.length) {
      setCachedDevices(devices);
      localStorage.setItem('devices', JSON.stringify(devices));
    }
    if (routeData && routeData.length) {
      setCachedRoute(routeData);
      localStorage.setItem('routeData', JSON.stringify(routeData));
    }
  }, [devices, routeData]);

  const validDevices = cachedDevices.filter(d => d.latitude !== null && d.longitude !== null);
  const hasRoute = cachedRoute && cachedRoute.length > 0;
  const defaultCenter: [number, number] = [9.0320, 38.7469];

  const initialView = hasRoute
    ? { center: [cachedRoute[0].latitude, cachedRoute[0].longitude], zoom: 13 }
    : validDevices.length > 0
    ? { center: [validDevices[0].latitude!, validDevices[0].longitude!], zoom: 13 }
    : { center: defaultCenter, zoom: 10 };

  return (
    <div className="h-96 w-full relative">
      <MapContainer ref={mapRef} center={initialView.center} zoom={initialView.zoom} className="h-full w-full rounded-lg">
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="OSM Standard">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                       attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OSM France">
            <TileLayer url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
                       attribution='&copy; OSM contributors, <a href="https://www.openstreetmap.fr/">OSM France</a>' />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Carto Light">
            <TileLayer url="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
                       attribution='&copy; OSM &amp; CARTO' />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Carto Dark">
            <TileLayer url="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
                       attribution='&copy; OSM &amp; CARTO' />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenTopoMap">
            <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                       attribution='Map data: &copy; OSM &amp; OpenTopoMap (CC-BY-SA)' />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapController devices={cachedDevices} selectedDevice={selectedDevice} routeData={cachedRoute} />

        {/* Route */}
        {showRoute && hasRoute && (
          <>
            <Polyline positions={cachedRoute.map(p => [p.latitude, p.longitude])}
                      color={styles?.routeColor ?? '#2563eb'}
                      weight={3} opacity={0.8}
                      dashArray={styles?.routeDashArray ?? '5,5'} />
            {/* Start marker */}
            <Marker position={[cachedRoute[0].latitude, cachedRoute[0].longitude]}
                    icon={L.divIcon({
                      className: 'custom-route-marker',
                      html: `<div class="w-6 h-6 ${styles?.routeStartColor ?? 'bg-green-500'} border-2 border-white rounded-full shadow-lg flex items-center justify-center"><span class="text-white text-xs font-bold">S</span></div>`,
                      iconSize: [24, 24], iconAnchor: [12, 12],
                    })} />
            {/* End marker */}
            {cachedRoute.length > 1 && (
              <Marker position={[cachedRoute[cachedRoute.length - 1].latitude, cachedRoute[cachedRoute.length - 1].longitude]}
                      icon={L.divIcon({
                        className: 'custom-route-marker',
                        html: `<div class="w-6 h-6 ${styles?.routeEndColor ?? 'bg-red-500'} border-2 border-white rounded-full shadow-lg flex items-center justify-center"><span class="text-white text-xs font-bold">E</span></div>`,
                        iconSize: [24, 24], iconAnchor: [12, 12],
                      })} />
            )}
          </>
        )}

        {/* Device markers */}
        {validDevices.map(d => {
          const { online, status } = getDeviceStatus(d);
          return (
            <Marker key={d.id}
                    position={[d.latitude!, d.longitude!]}
                    icon={createDeviceIcon(online, styles)}>
              <Popup>
                <div className="p-2 min-w-48">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{d.name}</h3>
                    <span className={`badge ${online ? 'badge-success' : 'badge-gray'}`}>{status}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">ID:</span><span>{d.uniqueId}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Location:</span><span>{d.latitude?.toFixed(6)}, {d.longitude?.toFixed(6)}</span></div>
                    {d.speed !== null && <div className="flex justify-between"><span className="text-gray-600">Speed:</span><span>{Math.round(d.speed)} km/h</span></div>}
                    {d.course !== null && <div className="flex justify-between"><span className="text-gray-600">Direction:</span><span>{Math.round(d.course)}°</span></div>}
                    {d.lastUpdate && <div className="flex justify-between"><span className="text-gray-600">Last Update:</span><span>{new Date(d.lastUpdate).toLocaleString()}</span></div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="text-sm font-medium text-gray-900 mb-2">{showRoute ? 'Route Legend' : 'Device Status'}</h4>
        <div className="space-y-2">
          {showRoute ? (
            <>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-xs text-gray-600">Start</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-xs text-gray-600">End</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-1 bg-blue-600"></div><span className="text-xs text-gray-600">Route</span></div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-xs text-gray-600">Online (&lt;10 min)</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-gray-400 rounded-full"></div><span className="text-xs text-gray-600">Offline</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
