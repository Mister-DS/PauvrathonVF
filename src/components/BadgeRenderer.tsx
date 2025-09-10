import { Badge } from '@/components/ui/badge';
import { Crown, Heart, Leaf, Flower, Sparkles, Sun, Flame, Waves, TreePine, Ghost, TreePine as Turkey, Gift, Shield, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeData {
  badge_type: string;
  display_name: string;
  badge_design: {
    color: string;
    icon: string;
    label: string;
    gradient: string;
  };
  month_year?: string;
}

interface BadgeRendererProps {
  badge: BadgeData;
  variant?: 'compact' | 'full';
  className?: string;
}

const iconMap = {
  crown: Crown,
  heart: Heart,
  leaf: Leaf,
  flower: Flower,
  sparkles: Sparkles,
  sun: Sun,
  flame: Flame,
  waves: Waves,
  'maple-leaf': TreePine,
  ghost: Ghost,
  turkey: Turkey,
  gift: Gift,
  shield: Shield,
  video: Video,
};

export function BadgeRenderer({ badge, variant = 'compact', className }: BadgeRendererProps) {
  if (!badge || !badge.badge_design) {
    return null;
  }

  const { badge_design, display_name } = badge;
  const IconComponent = iconMap[badge_design.icon as keyof typeof iconMap] || Crown;

  return (
    <Badge
      className={cn(
        `bg-gradient-to-r ${badge_design.gradient} text-white border-0`,
        variant === 'compact' ? 'text-xs py-1 px-2' : 'text-sm py-2 px-4',
        className
      )}
    >
      <IconComponent className={cn(
        'mr-1',
        variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4'
      )} />
      {display_name}
    </Badge>
  );
}