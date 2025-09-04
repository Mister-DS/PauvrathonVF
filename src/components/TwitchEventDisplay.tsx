import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeAddition } from '@/types';
import { Clock, Gift, Star, Zap } from 'lucide-react';

interface TwitchEventDisplayProps {
  timeAdditions: TimeAddition[];
  loading?: boolean;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'channel.subscribe':
      return <Star className="w-4 h-4 text-purple-500" />;
    case 'channel.cheer':
      return <Zap className="w-4 h-4 text-yellow-500" />;
    case 'channel.subscription.gift':
      return <Gift className="w-4 h-4 text-green-500" />;
    default:
      return <Clock className="w-4 h-4 text-blue-500" />;
  }
};

const getEventLabel = (eventType: string) => {
  switch (eventType) {
    case 'channel.subscribe':
      return 'Abonnement';
    case 'channel.cheer':
      return 'Bits';
    case 'channel.subscription.gift':
      return 'Gift Sub';
    default:
      return 'Événement';
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'channel.subscribe':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'channel.cheer':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'channel.subscription.gift':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
};

const formatEventDetails = (eventType: string, eventData: any) => {
  switch (eventType) {
    case 'channel.subscribe':
      return `Tier ${eventData.tier?.replace('000', '')} ${eventData.is_gift ? '(Gift)' : ''}`;
    case 'channel.cheer':
      return `${eventData.bits} bits`;
    case 'channel.subscription.gift':
      return `${eventData.total} gift subs (Tier ${eventData.tier?.replace('000', '')})`;
    default:
      return '';
  }
};

export function TwitchEventDisplay({ timeAdditions, loading }: TwitchEventDisplayProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Événements Twitch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Chargement des événements...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeAdditions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Événements Twitch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Aucun événement récent
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Événements Twitch ({timeAdditions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {timeAdditions.map((addition) => (
            <div
              key={addition.id}
              className="flex items-center justify-between p-3 rounded-lg bg-card border"
            >
              <div className="flex items-center gap-3">
                {getEventIcon(addition.event_type)}
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={getEventColor(addition.event_type)}>
                      {getEventLabel(addition.event_type)}
                    </Badge>
                    <span className="font-medium">
                      +{addition.time_seconds}s
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {addition.player_name && (
                      <span className="font-medium">{addition.player_name}</span>
                    )}
                    {addition.event_data && (
                      <span className="ml-2">
                        {formatEventDetails(addition.event_type, addition.event_data)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(addition.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}