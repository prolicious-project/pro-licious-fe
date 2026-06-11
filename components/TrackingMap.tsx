"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapNode {
  orderId: number;
  orderNumber: string;
  riderName: string;
  riderPhone: string;
  vendorName: string;
  customerName: string;
  status: string;
  progress: number;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  current: { lat: number; lng: number };
}

interface TrackingMapProps {
  nodes: MapNode[];
  trackedOrderId: number | null;
}

export default function TrackingMap({ nodes, trackedOrderId }: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Google Maps state and refs
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(false);
  const googleMapRef = useRef<any>(null);
  const googleOverlaysRef = useRef<any[]>([]);
  const googleDirectionsRendererRef = useRef<any>(null);
  const googlePolylineRef = useRef<any>(null);

  // Leaflet refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Custom HTML Icon Templates
  const vendorHtml = `
    <div class="w-9 h-9 flex items-center justify-center bg-red-500 border-2 border-white rounded-full shadow-lg text-white text-base transform hover:scale-110 transition-all duration-300">
      🏪
    </div>
  `;

  const customerHtml = `
    <div class="w-9 h-9 flex items-center justify-center bg-emerald-500 border-2 border-white rounded-full shadow-lg text-white text-base transform hover:scale-110 transition-all duration-300">
      🏠
    </div>
  `;

  const getRiderHtml = (name: string, isTracked: boolean) => `
    <div class="relative flex flex-col items-center">
      ${isTracked ? `<div class="absolute -top-8 bg-zinc-900 text-white font-extrabold text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50 border border-zinc-800 tracking-wide">${name}</div>` : ""}
      <div class="w-10 h-10 flex items-center justify-center bg-red-600 border-2 border-white rounded-full shadow-2xl text-white text-lg ${isTracked ? "radar-ring scale-110" : ""}">
        🛵
      </div>
    </div>
  `;

  // Dynamically load Google Maps script if API key is provided
  useEffect(() => {
    if (!googleMapsApiKey) {
      setGoogleMapsError(true);
      return;
    }

    if ((window as any).google && (window as any).google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const callbackName = "initGoogleMapCallback";
    (window as any)[callbackName] = () => {
      setGoogleMapsLoaded(true);
      delete (window as any)[callbackName];
    };

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => setGoogleMapsLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=geometry,places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setGoogleMapsError(true);
    };

    document.head.appendChild(script);

    return () => {
      const scriptNode = document.getElementById("google-maps-script");
      if (scriptNode) {
        // We keep it loaded to avoid double loading on navigate, but cleanup listener
        scriptNode.removeEventListener("load", () => setGoogleMapsLoaded(true));
      }
    };
  }, [googleMapsApiKey]);

  // --- GOOGLE MAPS IMPLEMENTATION ---
  useEffect(() => {
    if (!googleMapsLoaded || !mapContainerRef.current || leafletMapRef.current) return;

    // Create the HTML Overlay class inside this scope once google is loaded
    const google = (window as any).google;
    
    class GoogleHTMLOverlay extends google.maps.OverlayView {
      private latlng: any;
      private html: string;
      private div: HTMLDivElement | null = null;
      private offsetX: number;
      private offsetY: number;

      constructor(latlng: any, html: string, map: any, offsetX = -18, offsetY = -18) {
        super();
        this.latlng = latlng;
        this.html = html;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.setMap(map);
      }

      onAdd() {
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.cursor = "pointer";
        this.div.innerHTML = this.html;
        
        // Add click events to overlays to show simple info window
        this.div.addEventListener("click", () => {
          // Trigger standard google map click
        });

        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(this.div);
      }

      draw() {
        if (!this.div) return;
        const overlayProjection = this.getProjection();
        const position = overlayProjection.fromLatLngToDivPixel(this.latlng);
        if (position) {
          this.div.style.left = position.x + this.offsetX + "px";
          this.div.style.top = position.y + this.offsetY + "px";
        }
      }

      onRemove() {
        if (this.div) {
          this.div.parentNode?.removeChild(this.div);
          this.div = null;
        }
      }
    }

    // Initialize map centered at Gachibowli, Hyderabad
    const mapOptions = {
      center: { lat: 17.4483, lng: 78.3488 },
      zoom: 14,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    };

    const map = new google.maps.Map(mapContainerRef.current, mapOptions);
    googleMapRef.current = map;

    // Initialize directions renderer
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#ef4444",
        strokeOpacity: 0.8,
        strokeWeight: 5
      }
    });
    googleDirectionsRendererRef.current = directionsRenderer;

    return () => {
      if (googleDirectionsRendererRef.current) {
        googleDirectionsRendererRef.current.setMap(null);
      }
      googleMapRef.current = null;
    };
  }, [googleMapsLoaded]);

  // Sync Google Map Markers & Routes
  useEffect(() => {
    if (!googleMapsLoaded || !googleMapRef.current) return;
    const google = (window as any).google;
    const map = googleMapRef.current;

    // Clear old overlays
    googleOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    googleOverlaysRef.current = [];

    // Clear old polyline
    if (googlePolylineRef.current) {
      googlePolylineRef.current.setMap(null);
      googlePolylineRef.current = null;
    }

    // Reset directions
    if (googleDirectionsRendererRef.current) {
      googleDirectionsRendererRef.current.setDirections({ routes: [] });
    }

    if (nodes.length === 0) return;

    // Custom Overlay Class reference
    const GoogleHTMLOverlay = (google.maps.OverlayView as any);

    // Track bounds to zoom fit
    const bounds = new google.maps.LatLngBounds();
    let hasTrackedNode = false;

    // Identify overlay constructor helper
    const createOverlay = (lat: number, lng: number, html: string, ox = -18, oy = -18) => {
      const latlng = new google.maps.LatLng(lat, lng);
      bounds.extend(latlng);
      
      // Instantiate standard custom overlay
      const overlay = new (class extends google.maps.OverlayView {
        private div: HTMLDivElement | null = null;
        constructor(public pos: any, public content: string, public x: number, public y: number) {
          super();
          this.setMap(map);
        }
        onAdd() {
          this.div = document.createElement("div");
          this.div.style.position = "absolute";
          this.div.innerHTML = this.content;
          const panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(this.div);
        }
        draw() {
          if (!this.div) return;
          const proj = this.getProjection();
          const p = proj.fromLatLngToDivPixel(this.pos);
          if (p) {
            this.div.style.left = p.x + this.x + "px";
            this.div.style.top = p.y + this.y + "px";
          }
        }
        onRemove() {
          if (this.div) {
            this.div.parentNode?.removeChild(this.div);
            this.div = null;
          }
        }
      })(latlng, html, ox, oy);

      googleOverlaysRef.current.push(overlay);
    };

    nodes.forEach((node) => {
      const isTracked = trackedOrderId === node.orderId;

      // Render Vendor Marker
      createOverlay(node.start.lat, node.start.lng, vendorHtml, -18, -18);

      // Render Customer Marker
      createOverlay(node.end.lat, node.end.lng, customerHtml, -18, -18);

      // Render Rider Marker
      createOverlay(node.current.lat, node.current.lng, getRiderHtml(node.riderName, isTracked), -20, -40);

      if (isTracked) {
        hasTrackedNode = true;
        
        // Render straight dashed polyline route (Zomato short straight route)
        const polyline = new google.maps.Polyline({
          path: [
            new google.maps.LatLng(node.start.lat, node.start.lng),
            new google.maps.LatLng(node.current.lat, node.current.lng),
            new google.maps.LatLng(node.end.lat, node.end.lng)
          ],
          strokeOpacity: 0,
          icons: [{
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.8,
              strokeColor: "#ef4444",
              scale: 3,
              strokeWeight: 3
            },
            offset: "0",
            repeat: "12px"
          }],
          map: map
        });
        googlePolylineRef.current = polyline;

        // Map focuses on current tracked node's bounds (rider, vendor, destination)
        const trackedBounds = new google.maps.LatLngBounds();
        trackedBounds.extend(new google.maps.LatLng(node.start.lat, node.start.lng));
        trackedBounds.extend(new google.maps.LatLng(node.end.lat, node.end.lng));
        trackedBounds.extend(new google.maps.LatLng(node.current.lat, node.current.lng));
        
        map.fitBounds(trackedBounds, { top: 50, bottom: 50, left: 50, right: 50 });
      }
    });

    // If no order tracked, fit all active markers on screen
    if (!hasTrackedNode && nodes.length > 0) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }
  }, [nodes, trackedOrderId, googleMapsLoaded]);

  // --- LEAFLET FALLBACK IMPLEMENTATION ---
  useEffect(() => {
    if (googleMapsLoaded || !mapContainerRef.current || leafletMapRef.current) return;

    // Leaflet Icons
    const vendorIcon = L.divIcon({
      html: vendorHtml,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    const customerIcon = L.divIcon({
      html: customerHtml,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    const riderIcon = (name: string, isTracked: boolean) => L.divIcon({
      html: getRiderHtml(name, isTracked),
      className: "",
      iconSize: [40, 50],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const map = L.map(mapContainerRef.current).setView([17.4483, 78.3488], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    leafletMapRef.current = map;
    leafletLayerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMapRef.current = null;
      leafletLayerGroupRef.current = null;
    };
  }, [googleMapsLoaded]);

  // Sync Leaflet Fallback Markers & Lines
  useEffect(() => {
    if (googleMapsLoaded) return;
    const map = leafletMapRef.current;
    const layers = leafletLayerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    const boundsPoints: L.LatLngExpression[] = [];

    // Custom Leaflet Icons
    const vendorIcon = L.divIcon({
      html: vendorHtml,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const customerIcon = L.divIcon({
      html: customerHtml,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const riderIcon = (name: string, isTracked: boolean) => L.divIcon({
      html: getRiderHtml(name, isTracked),
      className: "",
      iconSize: [40, 50],
      iconAnchor: [20, 40]
    });

    nodes.forEach((node) => {
      const isTracked = trackedOrderId === node.orderId;

      L.marker([node.start.lat, node.start.lng], { icon: vendorIcon })
        .bindPopup(`<b>Vendor: ${node.vendorName}</b><br/>Order #${node.orderNumber}`)
        .addTo(layers);

      L.marker([node.end.lat, node.end.lng], { icon: customerIcon })
        .bindPopup(`<b>Destination: ${node.customerName}</b><br/>Order #${node.orderNumber}`)
        .addTo(layers);

      L.marker([node.current.lat, node.current.lng], { icon: riderIcon(node.riderName, isTracked) })
        .bindPopup(`<b>Rider: ${node.riderName}</b><br/>Status: ${node.status}`)
        .addTo(layers);

      boundsPoints.push([node.start.lat, node.start.lng]);
      boundsPoints.push([node.end.lat, node.end.lng]);
      boundsPoints.push([node.current.lat, node.current.lng]);

      if (isTracked) {
        L.polyline(
          [
            [node.start.lat, node.start.lng],
            [node.current.lat, node.current.lng],
            [node.end.lat, node.end.lng]
          ],
          {
            color: "#ef4444",
            weight: 3,
            dashArray: "6, 6",
            opacity: 0.8
          }
        ).addTo(layers);

        const trackedBounds = L.latLngBounds([
          [node.start.lat, node.start.lng],
          [node.current.lat, node.current.lng],
          [node.end.lat, node.end.lng]
        ]);
        map.fitBounds(trackedBounds, { padding: [50, 50], maxZoom: 16 });
      }
    });

    if (!trackedOrderId && boundsPoints.length > 0) {
      const allBounds = L.latLngBounds(boundsPoints);
      map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [nodes, trackedOrderId, googleMapsLoaded]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-gray-250 bg-gray-150">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes radar-pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.75);
          }
          70% {
            transform: scale(1.1);
            box-shadow: 0 0 0 12px rgba(220, 38, 38, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
          }
        }
        .radar-ring {
          animation: radar-pulse 1.8s infinite;
        }
      `}} />

      {/* Info indicator for developers/admins */}
      <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-xl shadow-xs border border-gray-200 text-[10px] font-semibold text-gray-500 pointer-events-none">
        {googleMapsLoaded ? "🗺️ Google Maps Active" : "🗺️ Leaflet Fallback Active"}
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-0" />
    </div>
  );
}
