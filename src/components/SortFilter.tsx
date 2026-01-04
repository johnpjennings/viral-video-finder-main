import { SortOption } from '@/types/video';
import { Button } from '@/components/ui/button';
import { TrendingUp, Eye, Clock, Heart } from 'lucide-react';

interface SortFilterProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

type SortOptionConfig = {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
};

const sortOptions: SortOptionConfig[] = [
  { value: 'performance', label: 'Best Performing', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'views', label: 'Most Views', icon: <Eye className="h-4 w-4" /> },
  { value: 'recent', label: 'Most Recent', icon: <Clock className="h-4 w-4" /> },
  { value: 'engagement', label: 'Engagement', icon: <Heart className="h-4 w-4" /> },
];

const filterRowClassName = 'flex flex-wrap items-center gap-2';
const labelClassName = 'mr-2 text-sm text-muted-foreground';
const buttonClassName = 'gap-2';

export function SortFilter({ currentSort, onSortChange }: SortFilterProps) {
  return (
    <div className={filterRowClassName}>
      <span className={labelClassName}>Sort by:</span>
      {sortOptions.map((option) => (
        <Button
          key={option.value}
          variant={currentSort === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange(option.value)}
          className={buttonClassName}
        >
          {option.icon}
          {option.label}
        </Button>
      ))}
    </div>
  );
}
