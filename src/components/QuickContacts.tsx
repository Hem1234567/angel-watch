import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Phone, User } from "lucide-react";

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

  useEffect(() => {
    localStorage.setItem("guardian-contacts", JSON.stringify(contacts));
  }, [contacts]);

  return (
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
        onClick={() => {
          const name = prompt("Contact name:");
          const phone = prompt("Phone number:");
          if (name && phone) {
            setContacts([...contacts, { id: Date.now().toString(), name, phone }]);
          }
        }}
        className="flex flex-col items-center gap-1.5 min-w-[64px]"
      >
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
          <Plus className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">Add</span>
      </motion.button>
    </div>
  );
}
