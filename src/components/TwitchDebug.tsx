import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Eye, EyeOff } from 'lucide-react';

export function TwitchDebug() {
  const { connectTwitch } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchClientId = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twitch-client-id');
      if (error) throw error;
      setClientId(data.client_id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentUrl = window.location.origin;
  const callbackUrl = `${currentUrl}/auth/callback`;

  return (
    <Card className="mt-4 neon-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🐛 Debug Twitch</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button onClick={fetchClientId} disabled={loading} size="sm">
            {loading ? 'Loading...' : 'Test Client ID'}
          </Button>
          <Button onClick={connectTwitch} size="sm" variant="outline">
            Test Auth Flow
          </Button>
        </div>

        {clientId && (
          <div className="space-y-2">
            <Badge variant="outline" className="text-green-600">
              ✅ Client ID récupéré
            </Badge>
            {showDetails && (
              <div className="text-xs font-mono bg-muted p-2 rounded">
                <div className="flex items-center justify-between">
                  <span>Client ID: {clientId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(clientId)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {showDetails && (
          <div className="space-y-3 text-xs">
            <div>
              <strong>Current URL:</strong>
              <div className="bg-muted p-2 rounded font-mono flex items-center justify-between">
                <span>{currentUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(currentUrl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div>
              <strong>Callback URL à configurer dans Twitch:</strong>
              <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded font-mono flex items-center justify-between">
                <span>{callbackUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(callbackUrl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
              <p className="font-semibold mb-2">📋 Configuration Twitch requise:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Va sur <a href="https://dev.twitch.tv/console/apps" target="_blank" className="text-blue-600 underline">dev.twitch.tv/console/apps</a></li>
                <li>Sélectionne ton app</li>
                <li>Ajoute cette URL de redirection: <code className="bg-muted px-1 rounded">{callbackUrl}</code></li>
                <li>Sauvegarde et teste</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}