import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Phone, Trash2, Users, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Contact {
  id: string;
  name: string;
  phone: string;
  group?: string;
}

interface Community {
  id: string;
  name: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem("guardian-contacts");
    return saved ? JSON.parse(saved) : [];
  });
  const [communities, setCommunities] = useState<Community[]>(() => {
    const saved = localStorage.getItem("guardian-communities");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddCommunity, setShowAddCommunity] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [newCommunity, setNewCommunity] = useState("");
  const [tab, setTab] = useState<"contacts" | "communities">("contacts");

  useEffect(() => {
    localStorage.setItem("guardian-contacts", JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem("guardian-communities", JSON.stringify(communities));
  }, [communities]);

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setContacts([...contacts, { ...newContact, id: Date.now().toString() }]);
    setNewContact({ name: "", phone: "" });
    setShowAddContact(false);
  };

  const addCommunity = () => {
    if (!newCommunity) return;
    setCommunities([...communities, { id: Date.now().toString(), name: newCommunity }]);
    setNewCommunity("");
    setShowAddCommunity(false);
  };

  return (
    <div className="min-h-screen pb-20 px-5 pt-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-display font-bold mb-6 text-foreground"
      >
        Contacts & Communities
      </motion.h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["contacts", "communities"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "contacts" ? (
          <motion.div key="contacts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No contacts yet. Add your trusted people.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.phone}</p>
                    </div>
                    <a href={`tel:${c.phone}`} className="p-2 rounded-full bg-safe/10 text-safe hover:bg-safe/20 transition-colors">
                      <Phone className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setContacts(contacts.filter((x) => x.id !== c.id))}
                      className="p-2 rounded-full text-muted-foreground hover:text-sos transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="communities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {communities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No communities yet. Create a safety circle.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {communities.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-safe/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-safe" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-sm text-muted-foreground">Safety Circle</p>
                    </div>
                    <button
                      onClick={() => setCommunities(communities.filter((x) => x.id !== c.id))}
                      className="p-2 rounded-full text-muted-foreground hover:text-sos transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => tab === "contacts" ? setShowAddContact(true) : setShowAddCommunity(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-foreground/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowAddContact(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold">Add Contact</h3>
                <button onClick={() => setShowAddContact(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <Input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              <Input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
              <Button onClick={addContact} className="w-full">Add Contact</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Community Modal */}
      <AnimatePresence>
        {showAddCommunity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-foreground/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowAddCommunity(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold">Create Community</h3>
                <button onClick={() => setShowAddCommunity(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <Input placeholder="Community name" value={newCommunity} onChange={(e) => setNewCommunity(e.target.value)} />
              <Button onClick={addCommunity} className="w-full">Create</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
