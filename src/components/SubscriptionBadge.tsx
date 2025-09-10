import { Badge } from '@/components/ui/badge';
import { Crown, Star } from 'lucide-react';
import { useBadgeStatus } from '@/hooks/useBadgeStatus';
import { BadgeRenderer } from './BadgeRenderer';
import { Json } from '@/integrations/supabase/types';

interface SubscriptionBadgeProps {
  variant?: 'compact' | 'full';
}

export function SubscriptionBadge({ variant = 'compact' }: SubscriptionBadgeProps) {
  const { badgeStatus } = useBadgeStatus();

  if (!badgeStatus?.has_active_badge) {
    return null;
  }

  // Parse current display badge
  const currentBadge = badgeStatus.current_display_badge as any;
  
  if (!currentBadge) {
    return null;
  }

  // For compact variant (next to username), show only the current priority badge
  if (variant === 'compact') {
    return <BadgeRenderer badge={currentBadge} variant="compact" className="ml-2" />;
  }

  // For full variant (in profile), show current badge and badge history
  const allBadges = (badgeStatus.all_badges as any[]) || [];
  
  return (
    <div className="flex flex-col space-y-3">
      {/* Current Display Badge */}
      <div>
        <h4 className="font-semibold mb-2 flex items-center">
          <Star className="w-4 h-4 mr-2 text-yellow-500" />
          Badge Actuel
        </h4>
        <BadgeRenderer badge={currentBadge} variant="full" />
      </div>

      {/* Badge History */}
      {allBadges.length > 1 && (
        <div>
          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
            Historique des Badges
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {allBadges
              .filter(badge => badge.id !== currentBadge.id)
              .slice(0, 6) // Limit to 6 badges in history
              .map((badge, index) => (
                <BadgeRenderer 
                  key={badge.id || index} 
                  badge={badge} 
                  variant="compact" 
                  className="opacity-75"
                />
              ))}
          </div>
        </div>
      )}

      {/* Expiration info for subscriber badges */}
      {badgeStatus.badge_expires_at && currentBadge.badge_type === 'subscriber' && (
        <p className="text-sm text-muted-foreground">
          Expire le {new Date(badgeStatus.badge_expires_at).toLocaleDateString('fr-FR')}
        </p>
      )}
      
      {/* Current month badge status */}
      {!badgeStatus.current_month_badge && currentBadge.badge_type === 'subscriber' && (
        <p className="text-sm text-amber-600">
          Badge du mois précédent - Renouvelez votre abonnement pour le badge de ce mois
        </p>
      )}
    </div>
  );
}