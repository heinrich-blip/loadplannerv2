import { Input } from "@/components/ui/input";
import
    {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
    } from "@/components/ui/select";
import { Search } from "lucide-react";

interface DieselOrderFiltersProps {
  onSearch: (query: string) => void;
  onStatusFilter: (status: string) => void;
}

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

export function DieselOrderFilters({
  onSearch,
  onStatusFilter,
}: DieselOrderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by order number, trip, or fuel station..."
          className="pl-10"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <Select defaultValue="all" onValueChange={onStatusFilter}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}