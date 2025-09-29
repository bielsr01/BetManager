import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Users, Check, Edit, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetData {
  id: string;
  house: string;
  accountHolder: string;
  betType: string;
  odd: number;
  stake: number;
  potentialProfit: number;
  result?: "won" | "lost" | "returned";
}

interface SurebetCardProps {
  id: string;
  eventDate: string;
  sport: string;
  league: string;
  teamA: string;
  teamB: string;
  profitPercentage: number;
  status: "pending" | "checked" | "resolved";
  bet1: BetData;
  bet2: BetData;
  onResolve: (betId: string, result: "won" | "lost" | "returned") => void;
  onStatusChange?: (surebetSetId: string, status: "checked") => void;
  onReset?: (surebetSetId: string) => void;
  onEdit?: (surebetSetId: string) => void;
  onDelete?: (surebetSetId: string) => void;
  className?: string;
}

export function BetCard({
  id,
  eventDate,
  sport,
  league,
  teamA,
  teamB,
  profitPercentage,
  status,
  bet1,
  bet2,
  onResolve,
  onStatusChange,
  onReset,
  onEdit,
  onDelete,
  className,
}: SurebetCardProps) {
  const isResolved = status === "resolved";
  const isChecked = status === "checked";
  const isPending = status === "pending";
  const totalStake = bet1.stake + bet2.stake;
  let actualProfit = 0;
  
  // Calculate actual profit based on bet results
  if (bet1.result && bet2.result) {
    if (bet1.result === "won" && bet2.result === "lost") {
      // Win/Loss: (winning_stake × odd) - losing_stake - winning_stake
      actualProfit = (bet1.stake * bet1.odd) - bet2.stake - bet1.stake;
    } else if (bet2.result === "won" && bet1.result === "lost") {
      // Win/Loss: (winning_stake × odd) - losing_stake - winning_stake
      actualProfit = (bet2.stake * bet2.odd) - bet1.stake - bet2.stake;
    } else if (bet1.result === "won" && bet2.result === "returned") {
      // Win/Return: (winning_stake × odd) - winning_stake + returned_stake
      actualProfit = (bet1.stake * bet1.odd) - bet1.stake + bet2.stake;
    } else if (bet2.result === "won" && bet1.result === "returned") {
      // Win/Return: (winning_stake × odd) - winning_stake + returned_stake
      actualProfit = (bet2.stake * bet2.odd) - bet2.stake + bet1.stake;
    } else if (bet1.result === "lost" && bet2.result === "lost") {
      // Loss/Loss: negative value (lost both stakes)
      actualProfit = -(bet1.stake + bet2.stake);
    } else if (bet1.result === "returned" && bet2.result === "returned") {
      // Both returned: no profit or loss
      actualProfit = 0;
    }
  }

  return (
    <Card className={cn("hover-elevate", className)} data-testid={`card-surebet-${id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {teamA} vs {teamB}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isPending && onStatusChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(id, "checked")}
                className="bg-background"
                data-testid={`button-mark-checked-${id}`}
              >
                Conferido
              </Button>
            )}
            {isChecked && (
              <Button
                size="sm"
                variant="outline"
                className="bg-background"
                disabled
                data-testid={`button-checked-${id}`}
              >
                <Check className="w-3 h-3 mr-1" />
                Conferido
              </Button>
            )}
            {isResolved && (
              <Badge className="bg-green-600 text-white">
                Resolvido
              </Badge>
            )}
            {isPending && !isResolved && !isChecked && <StatusBadge status="pending" />}
            <Badge variant="outline" className="bg-primary text-primary-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              {profitPercentage}%
            </Badge>
            {onReset && (bet1.result || bet2.result) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReset(id)}
                data-testid={`button-reset-${id}`}
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(id)}
                data-testid={`button-edit-${id}`}
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(id)}
                data-testid={`button-delete-${id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(eventDate).toLocaleDateString("pt-BR")}
          </div>
          <span>{sport} • {league}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bet 1 */}
        <div className="p-4 rounded-lg border bg-card/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{bet1.house}</Badge>
              <span className="text-sm text-muted-foreground">
                <Users className="w-3 h-3 inline mr-1" />
                {bet1.accountHolder}
              </span>
            </div>
            {bet1.result && <StatusBadge status={bet1.result} />}
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Tipo</span>
              <p className="font-medium">{bet1.betType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Odd</span>
              <p className="font-medium">{bet1.odd}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stake</span>
              <p className="font-medium">R$ {bet1.stake.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Lucro Pot.</span>
              <p className="font-medium text-betting-profit">R$ {bet1.potentialProfit.toFixed(2)}</p>
            </div>
          </div>
          
          {!bet1.result && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onResolve(bet1.id, "won")}
                className="bg-betting-win hover:bg-betting-win/80"
                data-testid={`button-resolve-won-${bet1.id}`}
              >
                Ganhou
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onResolve(bet1.id, "lost")}
                data-testid={`button-resolve-lost-${bet1.id}`}
              >
                Perdeu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResolve(bet1.id, "returned")}
                data-testid={`button-resolve-returned-${bet1.id}`}
              >
                Devolvido
              </Button>
            </div>
          )}
        </div>

        {/* Bet 2 */}
        <div className="p-4 rounded-lg border bg-card/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{bet2.house}</Badge>
              <span className="text-sm text-muted-foreground">
                <Users className="w-3 h-3 inline mr-1" />
                {bet2.accountHolder}
              </span>
            </div>
            {bet2.result && <StatusBadge status={bet2.result} />}
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Tipo</span>
              <p className="font-medium">{bet2.betType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Odd</span>
              <p className="font-medium">{bet2.odd}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stake</span>
              <p className="font-medium">R$ {bet2.stake.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Lucro Pot.</span>
              <p className="font-medium text-betting-profit">R$ {bet2.potentialProfit.toFixed(2)}</p>
            </div>
          </div>
          
          {!bet2.result && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onResolve(bet2.id, "won")}
                className="bg-betting-win hover:bg-betting-win/80"
                data-testid={`button-resolve-won-${bet2.id}`}
              >
                Ganhou
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onResolve(bet2.id, "lost")}
                data-testid={`button-resolve-lost-${bet2.id}`}
              >
                Perdeu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResolve(bet2.id, "returned")}
                data-testid={`button-resolve-returned-${bet2.id}`}
              >
                Devolvido
              </Button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Investido: </span>
            <span className="font-medium">R$ {totalStake.toFixed(2)}</span>
          </div>
          
          {(bet1.result && bet2.result) && (
            <div className="text-sm">
              <span className="text-muted-foreground">Lucro Real: </span>
              <span className={cn(
                "font-medium",
                actualProfit > 0 ? "text-betting-profit" : "text-betting-loss"
              )}>
                R$ {actualProfit.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}