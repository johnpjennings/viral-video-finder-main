import { Video } from '@/types/video';
import { Flame, TrendingUp, Eye, BarChart3 } from 'lucide-react';
import { formatCompactNumber } from '@/lib/formatters';

interface StatsOverviewProps {
  videos: Video[];
  avgViews: number;
}

type StatCard = {
  label: string;
  value: string | number;
  icon: typeof Flame;
  color: string;
  bgColor: string;
};

const gridClassName = 'grid grid-cols-2 gap-4 animate-fade-in md:grid-cols-4';
const cardClassName = 'rounded-xl border border-border bg-card p-4';
const iconWrapClassName = 'mb-3 inline-flex rounded-lg p-2';
const labelClassName = 'text-sm text-muted-foreground';

export function StatsOverview({ videos, avgViews }: StatsOverviewProps) {
  const getPerformanceMultiplier = (video: Video) =>
    avgViews > 0 ? video.views / avgViews : 1;

  const viralCount = videos.filter((video) => getPerformanceMultiplier(video) >= 5).length;
  const overperformingCount = videos.filter((video) => getPerformanceMultiplier(video) >= 2).length;
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const avgPerformance =
    videos.reduce((sum, v) => sum + getPerformanceMultiplier(v), 0) / videos.length;

  const stats: StatCard[] = [
    {
      label: 'Viral Videos',
      value: viralCount,
      icon: Flame,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Overperforming',
      value: overperformingCount,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Total Views',
      value: formatCompactNumber(totalViews),
      icon: Eye,
      color: 'text-foreground',
      bgColor: 'bg-secondary',
    },
    {
      label: 'Avg Performance',
      value: avgPerformance.toFixed(1) + 'x',
      icon: BarChart3,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className={gridClassName}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cardClassName}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className={`${iconWrapClassName} ${stat.bgColor}`}>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className={labelClassName}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
