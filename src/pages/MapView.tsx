import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const sosIcon = new L.DivIcon({
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#e53e3e;border:3px solid white;box-shadow:0 0 10px rgba(229,62,62,0.5)"></div>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const volunteerIcon = new L.DivIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#2d9d92;border:3px solid white;box-shadow:0 0 6px rgba(45,157,146,0.4)"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 15 });
    map.on("locationfound", (e) => setPosition(e.latlng));
  }, [map]);

  return position ? (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  ) : null;
}

interface Volunteer {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  role: string;
  is_verified: boolean;
  userName?: string;
}

interface SOSRequest {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  status: string;
  userName?: string;
  distanceKm?: number;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapView() {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "volunteers" | "sos">("all");
  const [myVolunteerLocation, setMyVolunteerLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const ownVolunteerPromise = user
        ? supabase.from("volunteers").select("latitude, longitude").eq("user_id", user.id).limit(1)
        : Promise.resolve({ data: null });

      const [{ data: vols }, { data: sos }, ownVolunteerResult] = await Promise.all([
        supabase.from("volunteers").select("*").eq("is_verified", true),
        supabase.from("sos_requests").select("*").eq("status", "pending"),
        ownVolunteerPromise,
      ]);

      const ownVolunteer = Array.isArray(ownVolunteerResult.data) ? ownVolunteerResult.data[0] : null;
      const myLocation = ownVolunteer && ownVolunteer.latitude !== null && ownVolunteer.longitude !== null
        ? { lat: ownVolunteer.latitude, lng: ownVolunteer.longitude }
        : null;
      setMyVolunteerLocation(myLocation);

      const allUserIds = [
        ...(vols || []).map((v) => v.user_id),
        ...(sos || []).map((s) => s.user_id),
      ];
      const uniqueIds = [...new Set(allUserIds)];

      let nameMap = new Map<string, string>();
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", uniqueIds);
        nameMap = new Map(profiles?.map((p) => [p.id, p.name || "Unknown"]) || []);
      }

      if (vols) {
        setVolunteers(vols.map((v) => ({ ...v, userName: nameMap.get(v.user_id) || "Volunteer" })));
      }

      if (sos) {
        const sortedSOS = sos
          .map((s) => {
            const distanceKm = myLocation
              ? getDistanceKm(myLocation.lat, myLocation.lng, s.latitude, s.longitude)
              : undefined;
            return {
              ...s,
              userName: nameMap.get(s.user_id) || "Unknown",
              distanceKm,
            };
          })
          .sort((a, b) => {
            if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
            if (a.distanceKm === undefined) return 1;
            if (b.distanceKm === undefined) return -1;
            return a.distanceKm - b.distanceKm;
          });

        const nearby = sortedSOS.filter((s) => s.distanceKm !== undefined && s.distanceKm <= 50);
        setSosRequests(nearby.length > 0 ? nearby : sortedSOS);
      }
    };

    fetchData();

    const channel = supabase
      .channel("map-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "volunteers" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_requests" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !navigator.geolocation) return;

    let watchId: number | null = null;
    let cancelled = false;

    const startTracking = async () => {
      const { data: ownVolunteer } = await supabase
        .from("volunteers")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (cancelled || !ownVolunteer || ownVolunteer.length === 0) return;

      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;
          setMyVolunteerLocation({ lat, lng });
          supabase
            .from("volunteers")
            .update({ latitude: lat, longitude: lng })
            .eq("user_id", user.id);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    };

    startTracking();

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  const acceptSOS = async (sos: SOSRequest) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("sos_requests")
      .update({ status: "accepted", accepted_by: user.id })
      .eq("id", sos.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (!data) {
      toast({ title: "Already accepted", description: "This SOS has already been taken." });
      return;
    }

    toast({ title: "✅ Accepted", description: "Opening navigation..." });
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}&travelmode=driving`,
      "_blank"
    );
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "volunteers", label: "Volunteers" },
    { key: "sos", label: "SOS Alerts" },
  ] as const;

  return (
    <div className="h-screen pb-16 relative">
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 right-4 z-[1000] flex gap-2"
      >
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground shadow-lg"
                : "glass text-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {myVolunteerLocation && (
        <div className="absolute top-16 left-4 z-[1000] px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground">
          Showing nearest SOS first (within 50 km if available)
        </div>
      )}

      <MapContainer
        center={[20, 78]}
        zoom={5}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />

        {(filter === "all" || filter === "volunteers") &&
          volunteers.map((v) =>
            v.latitude !== null && v.longitude !== null ? (
              <Marker key={v.id} position={[v.latitude, v.longitude]} icon={volunteerIcon}>
                <Popup>
                  <strong>{v.userName}</strong>
                  <br />
                  <span className="text-sm">{v.role}</span>
                </Popup>
              </Marker>
            ) : null
          )}

        {(filter === "all" || filter === "sos") &&
          sosRequests.map((s) => (
            <Marker key={s.id} position={[s.latitude, s.longitude]} icon={sosIcon}>
              <Popup>
                <div className="space-y-2">
                  <strong className="text-sos">🚨 SOS Alert</strong>
                  <br />
                  <span className="text-sm">From: {s.userName}</span>
                  {typeof s.distanceKm === "number" && (
                    <>
                      <br />
                      <span className="text-xs text-muted-foreground">Distance: {s.distanceKm.toFixed(1)} km</span>
                    </>
                  )}
                  <Button size="sm" onClick={() => acceptSOS(s)} className="w-full mt-2 gap-1">
                    <Navigation className="h-3 w-3" /> Accept & Navigate
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
