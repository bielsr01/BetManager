import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BetStatus = "pending" | "won" | "lost" | "returned";

interface StatusBadgeProps {
  status: BetStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Pendente",
    variant: "secondary" as const,
    className: "bg-betting-pending text-white",
  },
  won: {
    label: "Ganhou",
    variant: "default" as const,
    className: "bg-betting-win text-white",
  },
  lost: {
    label: "Perdeu",
    variant: "destructive" as const,
    className: "bg-betting-loss text-white",
  },
  returned: {
    label: "Devolvido",
    variant: "outline" as const,
    className: "bg-betting-returned text-foreground",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}