import {
  Play,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Calendar,
  Clapperboard,
  LayoutDashboard,
  ListTodo,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

type NavTool = {
  id: string;
  label: string;
  icon: typeof BarChart3;
  path: string;
};

const researchTools: NavTool[] = [
  { id: 'channel', label: 'Channel Analyzer', icon: BarChart3, path: '/channel-analyzer' },
  { id: 'trends', label: 'Trend Finder', icon: TrendingUp, path: '/trend-finder' },
];

const videoProductionTools: NavTool[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/overview' },
  { id: 'production', label: 'Video Production Suite', icon: Clapperboard, path: '/production' },
];

const contentTools: NavTool[] = [
  { id: 'calendar', label: 'Content Calendar', icon: Calendar, path: '/content-calendar' },
  { id: 'planner', label: 'Planner', icon: ListTodo, path: '/planner' },
];

const headerClassName =
  'sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm';
const headerInnerClassName = 'container mx-auto flex items-center justify-between px-4 py-4';
const brandButtonClassName = 'flex cursor-pointer items-center gap-2';
const brandIconClassName = 'rounded-lg bg-primary/10 p-2';
const menuButtonClassName = 'gap-2';
const menuClassName = 'w-48';
const menuItemClassName = 'cursor-pointer gap-2';
const mainClassName = 'container mx-auto px-4 pb-16';
const footerClassName = 'border-t border-border py-8';
const footerInnerClassName = 'container mx-auto px-4 text-center text-sm text-muted-foreground';

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClassName}>
        <div className={headerInnerClassName}>
          <div
            className={brandButtonClassName}
            onClick={() => navigate('/channel-analyzer')}
          >
            <div className={brandIconClassName}>
              <Play className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">VideoTools</span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={menuButtonClassName}>
                  Research Tools
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={menuClassName}>
                {researchTools.map((tool) => (
                  <DropdownMenuItem
                    key={tool.id}
                    onClick={() => navigate(tool.path)}
                    className={menuItemClassName}
                  >
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={menuButtonClassName}>
                  Video Production
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={menuClassName}>
                {videoProductionTools.map((tool) => (
                  <DropdownMenuItem
                    key={tool.id}
                    onClick={() => navigate(tool.path)}
                    className={menuItemClassName}
                  >
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={menuButtonClassName}>
                  Content Calendar
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={menuClassName}>
                {contentTools.map((tool) => (
                  <DropdownMenuItem
                    key={tool.id}
                    onClick={() => navigate(tool.path)}
                    className={menuItemClassName}
                  >
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className={mainClassName}>{children}</main>

      <footer className={footerClassName}>
        <div className={footerInnerClassName}>
          <p>VideoTools. Analyze. Discover. Create.</p>
        </div>
      </footer>
    </div>
  );
}
