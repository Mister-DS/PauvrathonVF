import { Badge } from '@/components/ui/badge';
import { Crown, Star } from 'lucide-react';
import { useBadgeStatus } from '@/hooks/useBadgeStatus';

interface SubscriptionBadgeProps {
  variant?: 'compact' | 'full';
}

export function SubscriptionBadge({ variant = 'compact' }: SubscriptionBadgeProps) {
  const { badgeStatus } = useBadgeStatus();

  if (!badgeStatus?.has_active_badge) {
    return null;
  }

  const isCurrentMonth = badgeStatus.current_month_badge;
  const expiresAt = badgeStatus.badge_expires_at;

  if (variant === 'compact') {
    return (
      <Badge
        variant={isCurrentMonth ? 'default' : 'secondary'}
        className="ml-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0"
      >
        <Crown className="w-3 h-3 mr-1" />
        Abonné
      </Badge>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <Badge
        variant={isCurrentMonth ? 'default' : 'secondary'}
        className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 px-4 py-2"
      >
        <Crown className="w-4 h-4 mr-2" />
        Badge Abonné
        {isCurrentMonth && <Star className="w-3 h-3 ml-2" />}
      </Badge>
      
      {expiresAt && (
        <p className="text-sm text-muted-foreground">
          Expire le {new Date(expiresAt).toLocaleDateString('fr-FR')}
        </p>
      )}
      
      {!isCurrentMonth && (
        <p className="text-sm text-amber-600">
          Badge du mois précédent - Renouvelez votre abonnement pour le badge de ce mois
        </p>
      )}
    </div>
  );
}