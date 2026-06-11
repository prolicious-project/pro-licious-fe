"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { LeafletMapProps } from "./LeafletMap";

function RecenterBounds({
  riderPosition,
  vendorPosition,
  customerPosition,
}: {
  riderPosition: [number, number] | null;
  vendorPosition: [number, number] | null;
  customerPosition: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (riderPosition) points.push(riderPosition);
    if (vendorPosition) points.push(vendorPosition);
    if (customerPosition) points.push(customerPosition);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [riderPosition, vendorPosition, customerPosition, map]);

  return null;
}

export default function LeafletMapInner({
  riderPosition,
  vendorPosition,
  customerPosition,
  className = "h-[450px] w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-800",
}: LeafletMapProps) {
  // Setup custom Leaflet icons using HTML div markers
  const riderIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center w-10 h-10 bg-blue-600 border-2 border-white rounded-full shadow-lg text-white">🏍️</div>`,
    className: "custom-marker-rider",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const vendorIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center w-10 h-10 bg-red-600 border-2 border-white rounded-full shadow-lg text-white">🏪</div>`,
    className: "custom-marker-vendor",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const customerIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center w-10 h-10 bg-emerald-600 border-2 border-white rounded-full shadow-lg text-white">🏠</div>`,
    className: "custom-marker-customer",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const centerPosition: [number, number] = riderPosition || vendorPosition || customerPosition || [17.385, 78.4867];

  return (
    <div className={className}>
      <MapContainer
        center={centerPosition}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {riderPosition && (
          <Marker position={riderPosition} icon={riderIcon}>
            <Popup>
              <div className="font-bold text-gray-900 text-xs">Rider (Your Location)</div>
            </Popup>
          </Marker>
        )}

        {vendorPosition && (
          <Marker position={vendorPosition} icon={vendorIcon}>
            <Popup>
              <div className="font-bold text-gray-900 text-xs">Vendor (Store)</div>
            </Popup>
          </Marker>
        )}

        {customerPosition && (
          <Marker position={customerPosition} icon={customerIcon}>
            <Popup>
              <div className="font-bold text-gray-900 text-xs">Customer Delivery Address</div>
            </Popup>
          </Marker>
        )}

        {/* Dash route polyline: Rider to Vendor (blue) */}
        {riderPosition && vendorPosition && (
          <Polyline
            positions={[riderPosition, vendorPosition]}
            pathOptions={{ color: "#3b82f6", weight: 3, dashArray: "6, 6" }}
          />
        )}

        {/* Dash route polyline: Vendor to Customer (green) */}
        {vendorPosition && customerPosition && (
          <Polyline
            positions={[vendorPosition, customerPosition]}
            pathOptions={{ color: "#10b981", weight: 4, dashArray: "6, 6" }}
          />
        )}

        <RecenterBounds
          riderPosition={riderPosition}
          vendorPosition={vendorPosition}
          customerPosition={customerPosition}
        />
      </MapContainer>
    </div>
  );
}
