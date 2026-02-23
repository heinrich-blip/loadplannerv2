import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import
  {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import
  {
    addWeeks,
    endOfWeek,
    format,
    getWeek,
    startOfWeek
  } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface QuickFiltersProps {
  onSearch: (query: string) => void;
  onStatusFilter: (status: string) => void;
  onOriginFilter: (origin: string) => void;
  onWeekFilter?: (weekStart: Date | null, weekEnd: Date | null) => void;
}

interface WeekOption {
  value: string;
  label: string;
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isNext: boolean;
  isPast: boolean;
}

function generateWeekOptions(): WeekOption[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const weekOptionsConfig = { weekStartsOn: 1 as const, firstWeekContainsDate: 4 as const };
  const currentWeekNumber = getWeek(today, weekOptionsConfig);
  
  const options: WeekOption[] = [];
  
  // Generate all 52 weeks of the current year
  // Start from week 1 of current year
  const jan4 = new Date(currentYear, 0, 4); // Jan 4 is always in week 1 (ISO standard)
  const week1Start = startOfWeek(jan4, weekOptionsConfig);
  
  for (let weekNum = 1; weekNum <= 52; weekNum++) {
    const weekStart = addWeeks(week1Start, weekNum - 1);
    const weekEnd = endOfWeek(weekStart, weekOptionsConfig);
    
    options.push({
      value: `week-${weekNum}`,
      label: `Week ${weekNum}`,
      weekNumber: weekNum,
      year: currentYear,
      startDate: weekStart,
      endDate: weekEnd,
      isCurrent: weekNum === currentWeekNumber,
      isNext: weekNum === currentWeekNumber + 1,
      isPast: weekNum < currentWeekNumber,
    });
  }
  
  return options;
}

export function QuickFilters({ onSearch, onStatusFilter, onOriginFilter, onWeekFilter }: QuickFiltersProps) {
  const weekOptions = useMemo(() => generateWeekOptions(), []);
  const currentWeekOption = weekOptions.find(w => w.isCurrent);
  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeekOption?.value ?? 'all');
  const selectedWeekData = weekOptions.find(w => w.value === selectedWeek);
  
  const handleWeekChange = (value: string) => {
    setSelectedWeek(value);
    if (value === 'all') {
      onWeekFilter?.(null, null);
    } else {
      const week = weekOptions.find(w => w.value === value);
      if (week) {
        onWeekFilter?.(week.startDate, week.endDate);
      }
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentIndex = weekOptions.findIndex(w => w.value === selectedWeek);
    if (currentIndex === -1) {
      // If "all" is selected, go to current week
      if (currentWeekOption) {
        handleWeekChange(currentWeekOption.value);
      }
      return;
    }
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < weekOptions.length) {
      handleWeekChange(weekOptions[newIndex].value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Week Selector - Modern Card Design */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Week View</span>
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateWeek('prev')}
            disabled={selectedWeek === weekOptions[0]?.value}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select value={selectedWeek} onValueChange={handleWeekChange}>
            <SelectTrigger className="w-[220px] bg-background">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span>All Weeks</span>
                </div>
              </SelectItem>
              {weekOptions.map((week) => (
                <SelectItem key={week.value} value={week.value}>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums w-16">
                      {week.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({format(week.startDate, 'MMM d')})
                    </span>
                    {week.isCurrent && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-primary/10 text-primary">
                        Current
                      </Badge>
                    )}
                    {week.isNext && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-accent/10 text-accent">
                        Next
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateWeek('next')}
            disabled={selectedWeek === weekOptions[weekOptions.length - 1]?.value}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Selected Week Info */}
        {selectedWeekData && (
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-background rounded-lg border">
            <div className="text-sm">
              <span className="text-muted-foreground">Date Range: </span>
              <span className="font-medium text-foreground">
                {format(selectedWeekData.startDate, 'MMM d')} - {format(selectedWeekData.endDate, 'MMM d, yyyy')}
              </span>
            </div>
            {selectedWeekData.isCurrent && (
              <Badge className="bg-primary/10 text-primary border-0">
                This Week
              </Badge>
            )}
            {selectedWeekData.isNext && (
              <Badge className="bg-accent/10 text-accent border-0">
                Upcoming
              </Badge>
            )}
            {selectedWeekData.isPast && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                Past
              </Badge>
            )}
          </div>
        )}
        
        {selectedWeek !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleWeekChange('all')}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
      
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search loads by ID, driver, route..."
            className="pl-9 bg-background"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select onValueChange={onStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-transit">In Transit</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={onOriginFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Origin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Origins</SelectItem>
              <SelectItem value="Harare">Harare</SelectItem>
              <SelectItem value="Bulawayo">Bulawayo</SelectItem>
              <SelectItem value="Mutare">Mutare</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}