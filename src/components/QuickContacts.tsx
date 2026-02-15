import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Phone, User, X, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

export function QuickContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem("guardian-contacts");
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("guardian-contacts", JSON.stringify(contacts));
  }, [contacts]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (contactId: string): Promise<string | undefined> => {
    if (!avatarFile || !user) return undefined;
    const ext = avatarFile.name.split(".").pop();
    const path = `${user.id}/${contactId}.${ext}`;
    const { error } = await supabase.storage
      .from("contact-avatars")
      .upload(path, avatarFile, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      return undefined;
    }
    const { data } = supabase.storage.from("contact-avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const addContact = async () => {
    if (!newName || !newPhone) return;
    setUploading(true);
    const id = Date.now().toString();
    const avatarUrl = await uploadAvatar(id);
    setContacts([...contacts, { id, name: newName, phone: newPhone, avatar: avatarUrl }]);
    setNewName("");
    setNewPhone("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowModal(false);
    setUploading(false);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {contacts.slice(0, 5).map((contact, i) => (
          <motion.a
            key={contact.id}
            href={`tel:${contact.phone}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-1.5 min-w-[64px]"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 hover:border-primary transition-colors overflow-hidden">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate w-16 text-center">{contact.name}</span>
          </motion.a>
        ))}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: contacts.length * 0.1 }}
          onClick={() => setShowModal(true)}
          className="flex flex-col items-center gap-1.5 min-w-[64px]"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">Add</span>
        </motion.button>
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-foreground">Add Quick Contact</h3>
                <button onClick={() => { setShowModal(false); setAvatarFile(null); setAvatarPreview(null); }}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Avatar picker */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-7 w-7 text-primary/50" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">Tap to add photo</p>

              <Input
                placeholder="Contact name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Phone number"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <Button onClick={addContact} className="w-full" disabled={!newName || !newPhone || uploading}>
                {uploading ? "Adding..." : "Add Contact"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
