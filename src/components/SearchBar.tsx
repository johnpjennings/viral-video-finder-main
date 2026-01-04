import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

const formClassName = 'mx-auto w-full max-w-2xl';
const inputWrapperClassName = 'relative flex gap-3';
const inputContainerClassName = 'relative flex-1';
const inputClassName =
  'h-14 border-border/50 bg-secondary/50 pl-12 text-base focus:border-primary';
const buttonClassName = 'h-14 px-8';

export function SearchBar({ onSearch, isLoading, initialQuery }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery ?? '');

  useEffect(() => {
    if (typeof initialQuery === 'string') {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={formClassName}>
      <div className={inputWrapperClassName}>
        <div className={inputContainerClassName}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter YouTube channel name or URL..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputClassName}
          />
        </div>
        <Button
          type="submit"
          variant="glow"
          size="lg"
          disabled={isLoading || !query.trim()}
          className={buttonClassName}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Analyze'
          )}
        </Button>
      </div>
    </form>
  );
}
