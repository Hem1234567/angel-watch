import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Navigation, ExternalLink } from "lucide-react";
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
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#e53e3e;border:3px solid white;box-shadow:0 0 10px rgba(229,62,62,0.5);animation:pulse 2s infinite"></div>`,
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
  profiles?: { name: string | null } | null;
}

interface SOSRequest {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  status: string;
  profiles?: { name: string | null } | null;
}

export default function MapView() {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "volunteers" | "sos">("all");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: vols }, { data: sos }] = await Promise.all([
        supabase.from("volunteers").select("*, profiles:user_id(name)").eq("is_verified", true),
        supabase.from("sos_requests").select("*, profiles:user_id(name)").eq("status", "pending"),
      ]);
      if (vols) setVolunteers(vols as unknown as Volunteer[]);
      if (sos) setSosRequests(sos as unknown as SOSRequest[]);
    };
    fetchData();

    const channel = supabase
      .channel("map-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "volunteers" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_requests" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const acceptSOS = async (sos: SOSRequest) => {
    if (!user) return;
    const { error } = await supabase
      .from("sos_requests")
      .update({ status: "accepted", accepted_by: user.id })
      .eq("id", sos.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Accepted", description: "Opening navigation..." });
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}&travelmode=driving`,
        "_blank"
      );
    }
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
            v.latitude && v.longitude ? (
              <Marker key={v.id} position={[v.latitude, v.longitude]} icon={volunteerIcon}>
                <Popup>
                  <strong>{(v.profiles as any)?.name || "Volunteer"}</strong>
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
                  <span className="text-sm">From: {(s.profiles as any)?.name || "Unknown"}</span>
                  <br />
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
