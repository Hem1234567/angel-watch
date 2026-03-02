import { motion } from "framer-motion";
import { Users, UserCheck, Clock } from "lucide-react";

interface AdminStatsProps {
  total: number;
  verified: number;
  pending: number;
}

export function AdminStats({ total, verified, pending }: AdminStatsProps) {
  const stats = [
    { label: "Total", value: total, icon: Users, color: "text-primary" },
    { label: "Verified", value: verified, icon: UserCheck, color: "text-safe" },
    { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-4 rounded-xl bg-card border border-border/50 text-center"
        >
          <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
          <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
