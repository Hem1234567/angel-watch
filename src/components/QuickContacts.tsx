import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Phone, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Contact {
  id: string;
  name: string;
  phone: string;
}

export function QuickContacts() {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem("guardian-contacts");
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    localStorage.setItem("guardian-contacts", JSON.stringify(contacts));
  }, [contacts]);

  const addContact = () => {
    if (!newName || !newPhone) return;
    setContacts([...contacts, { id: Date.now().toString(), name: newName, phone: newPhone }]);
    setNewName("");
    setNewPhone("");
    setShowModal(false);
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
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 hover:border-primary transition-colors">
              <User className="h-6 w-6 text-primary" />
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
            className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-foreground/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-foreground">Add Quick Contact</h3>
                <button onClick={() => setShowModal(false)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
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
              <Button onClick={addContact} className="w-full" disabled={!newName || !newPhone}>
                Add Contact
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
