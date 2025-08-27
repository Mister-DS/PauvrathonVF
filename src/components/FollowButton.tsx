import { Button } from '@/components/ui/button';
import { Heart, Users } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';

interface FollowButtonProps {
  streamerId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showCount?: boolean;
}

export function FollowButton({ 
  streamerId, 
  variant = 'outline', 
  size = 'default',
  showCount = false 
}: FollowButtonProps) {
  const { isFollowing, loading, followersCount, toggleFollow } = useFollow(streamerId);

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={toggleFollow}
        disabled={loading}
        variant={isFollowing ? 'default' : variant}
        size={size}
        className={`transition-all ${
          isFollowing 
            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
            : 'hover:bg-primary hover:text-primary-foreground'
        }`}
      >
        <Heart 
          className={`h-4 w-4 mr-2 transition-colors ${
            isFollowing ? 'fill-current text-primary-foreground' : ''
          }`} 
        />
        {isFollowing ? 'Suivi' : 'Suivre'}
      </Button>
      
      {showCount && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{followersCount}</span>
        </div>
      )}
    </div>
  );
}