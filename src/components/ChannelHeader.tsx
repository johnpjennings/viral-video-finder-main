import { Channel } from '@/types/video';
import { Users, Video, Eye } from 'lucide-react';
import { formatCompactNumber } from '@/lib/formatters';

interface ChannelHeaderProps {
  channel: Channel;
  avgViews: number;
}

const cardClassName = 'flex items-center gap-6 rounded-xl border border-border bg-card p-6 animate-fade-in';
const avatarClassName = 'h-20 w-20 rounded-full border-2 border-primary/50';
const metaRowClassName = 'mt-2 flex flex-wrap items-center gap-6 text-muted-foreground';
const metaItemClassName = 'flex items-center gap-2';

export function ChannelHeader({ channel, avgViews }: ChannelHeaderProps) {
  return (
    <div className={cardClassName}>
      <img
        src={channel.thumbnail}
        alt={channel.name}
        className={avatarClassName}
      />
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-foreground">{channel.name}</h2>
        <div className={metaRowClassName}>
          <div className={metaItemClassName}>
            <Users className="h-4 w-4" />
            <span>{formatCompactNumber(channel.subscriberCount)} subscribers</span>
          </div>
          <div className={metaItemClassName}>
            <Video className="h-4 w-4" />
            <span>{channel.videoCount} videos</span>
          </div>
          <div className={metaItemClassName}>
            <Eye className="h-4 w-4" />
            <span>{formatCompactNumber(avgViews)} avg views</span>
          </div>
        </div>
      </div>
    </div>
  );
}
