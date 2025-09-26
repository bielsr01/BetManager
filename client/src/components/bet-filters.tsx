import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Filter, X, Search } from "lucide-react";
import { DateRange } from "react-day-picker";

interface BetFiltersProps {
  onFiltersChange: (filters: FilterValues) => void;
  className?: string;
}

interface FilterValues {
  status?: string;
  minStake?: number;
  maxStake?: number;
  minProfit?: number;
  maxProfit?: number;
  dateRange?: DateRange;
  sport?: string;
  league?: string;
  house?: string;
}

export function BetFilters({ onFiltersChange, className }: BetFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({});
  const [isExpanded, setIsExpanded] = useState(false);

  //todo: remove mock functionality
  const mockSports = ["Futebol", "Basquete", "Tennis", "Vôlei"];
  const mockHouses = ["Pinnacle", "Betano", "Bet365", "1xBet", "Sportingbet"];

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    console.log("Filters changed:", newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFiltersChange({});
    console.log("Filters cleared");
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== "" && value !== null
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-toggle-filters"
            >
              {isExpanded ? "Recolher" : "Expandir"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Filters - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select 
              value={filters.status || ""} 
              onValueChange={(value) => handleFilterChange("status", value || undefined)}
            >
              <SelectTrigger id="status-filter" data-testid="select-status-filter">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="resolved">Resolvidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport-filter">Esporte</Label>
            <Select 
              value={filters.sport || ""} 
              onValueChange={(value) => handleFilterChange("sport", value || undefined)}
            >
              <SelectTrigger id="sport-filter" data-testid="select-sport-filter">
                <SelectValue placeholder="Todos os esportes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os esportes</SelectItem>
                {mockSports.map((sport) => (
                  <SelectItem key={sport} value={sport}>
                    {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="house-filter">Casa de Apostas</Label>
            <Select 
              value={filters.house || ""} 
              onValueChange={(value) => handleFilterChange("house", value || undefined)}
            >
              <SelectTrigger id="house-filter" data-testid="select-house-filter">
                <SelectValue placeholder="Todas as casas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as casas</SelectItem>
                {mockHouses.map((house) => (
                  <SelectItem key={house} value={house}>
                    {house}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <DatePickerWithRange
                  selected={filters.dateRange}
                  onSelect={(range) => handleFilterChange("dateRange", range)}
                  placeholder="Selecionar período"
                  data-testid="date-range-filter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="league-filter">Liga</Label>
                <Input
                  id="league-filter"
                  placeholder="Filtrar por liga..."
                  value={filters.league || ""}
                  onChange={(e) => handleFilterChange("league", e.target.value || undefined)}
                  data-testid="input-league-filter"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Aposta (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={filters.minStake || ""}
                    onChange={(e) => handleFilterChange("minStake", e.target.value ? Number(e.target.value) : undefined)}
                    data-testid="input-min-stake"
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={filters.maxStake || ""}
                    onChange={(e) => handleFilterChange("maxStake", e.target.value ? Number(e.target.value) : undefined)}
                    data-testid="input-max-stake"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lucro Potencial (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={filters.minProfit || ""}
                    onChange={(e) => handleFilterChange("minProfit", e.target.value ? Number(e.target.value) : undefined)}
                    data-testid="input-min-profit"
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={filters.maxProfit || ""}
                    onChange={(e) => handleFilterChange("maxProfit", e.target.value ? Number(e.target.value) : undefined)}
                    data-testid="input-max-profit"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}