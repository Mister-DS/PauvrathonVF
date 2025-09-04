import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TwitchEventDisplay } from '@/components/TwitchEventDisplay';
import { useTimeAdditions } from '@/hooks/useTimeAdditions';
import { useRealtimeTimer } from '@/hooks/useRealtimeTimer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Streamer, TimeAddition } from '@/types';
import { Clock, Users, TrendingUp, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function StreamerDashboard() {
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les données du streamer
  useEffect(() => {
    if (!user) return;

    const fetchStreamer = async () => {
      try {
        const { data, error } = await supabase
          .from('streamers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erreur récupération streamer:', error);
          return;
        }

        setStreamer(data as Streamer);
      } catch (error) {
        console.error('Erreur inattendue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamer();
  }, [user]);

  // Hooks pour les time additions et realtime
  const { 
    timeAdditions, 
    totalTimeAdded, 
    eventCounts, 
    addTimeAddition 
  } = useTimeAdditions(streamer?.id);

  // Hook pour les mises à jour en temps réel
  const { isConnected } = useRealtimeTimer({
    streamerId: streamer?.id,
    onTimeAdded: (timeAddition: TimeAddition) => {
      console.log('Nouvel événement reçu:', timeAddition);
      addTimeAddition(timeAddition);
      toast.success(
        `+${timeAddition.time_seconds}s ajoutées par ${timeAddition.player_name}!`,
        {
          description: `Événement: ${timeAddition.event_type}`
        }
      );
    },
    onStreamerUpdate: (updatedStreamer: any) => {
      console.log('Streamer mis à jour:', updatedStreamer);
      setStreamer(prev => prev ? { ...prev, ...updatedStreamer } : null);
    }
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Chargement du dashboard...</div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Profil streamer non trouvé</h2>
              <p className="text-muted-foreground">
                Vous devez avoir un profil streamer pour accéder à ce dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Streamer</h1>
          <p className="text-muted-foreground">
            Suivi en temps réel de vos événements Twitch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            <Activity className="w-3 h-3 mr-1" />
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </Badge>
          {streamer.is_live && (
            <Badge variant="outline" className="text-red-500 border-red-500">
              🔴 En direct
            </Badge>
          )}
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps total ajouté</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(streamer.total_time_added || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{formatTime(totalTimeAdded)} cette session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnements</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventCounts['channel.subscribe'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Subs reçus aujourd'hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bits reçus</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventCounts['channel.cheer'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Événements bits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gift Subs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventCounts['channel.subscription.gift'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Gift subs reçus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informations du stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Informations du Stream</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titre du stream</label>
                <p className="text-sm text-muted-foreground">
                  {streamer.stream_title || 'Aucun titre défini'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Status</label>
                <p className="text-sm text-muted-foreground capitalize">
                  {streamer.status || 'offline'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Twitch ID</label>
                <p className="text-sm text-muted-foreground font-mono">
                  {streamer.twitch_id}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">URL du webhook</label>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono break-all">
                  https://pylbfjbfhaulpzrzsosc.supabase.co/functions/v1/twitch-eventsub
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Événements en temps réel */}
        <div className="lg:col-span-2">
          <TwitchEventDisplay 
            timeAdditions={timeAdditions}
            loading={false}
          />
        </div>
      </div>

      {/* Instructions de configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Twitch EventSub</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pour recevoir les événements Twitch, configurez les webhooks EventSub avec l'URL suivante :
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <code className="text-sm">
                https://pylbfjbfhaulpzrzsosc.supabase.co/functions/v1/twitch-eventsub
              </code>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Événements supportés :</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>channel.subscribe</code> - Nouveaux abonnements</li>
                <li>• <code>channel.cheer</code> - Événements de bits</li>
                <li>• <code>channel.subscription.gift</code> - Gift subscriptions</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Les événements sont automatiquement traités et ajoutent du temps à votre stream selon les règles configurées.
                Le status de connexion en temps réel est affiché en haut à droite.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}