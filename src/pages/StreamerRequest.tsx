import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send, User } from 'lucide-react';

export default function StreamerRequest() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    twitchUsername: '',
    streamLink: '',
    motivation: ''
  });

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if already a streamer or admin
  if (profile?.role === 'streamer' || profile?.role === 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupérer ou créer le profil pour obtenir son ID
      let profileId;
      
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        throw profileCheckError;
      }

      if (!existingProfile) {
        // Créer le profil s'il n'existe pas
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            twitch_username: formData.twitchUsername,
            twitch_display_name: formData.twitchUsername,
            role: 'viewer'
          })
          .select('id')
          .single();

        if (createProfileError) throw createProfileError;
        profileId = newProfile.id;
      } else {
        profileId = existingProfile.id;
      }

      // Vérifier s'il n'y a pas déjà une demande en cours
      const { data: existingRequest } = await supabase
        .from('streamer_requests')
        .select('id, status')
        .eq('user_id', profileId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        toast({
          title: "Demande déjà en cours",
          description: "Vous avez déjà une demande en cours d'examen.",
          variant: "destructive",
        });
        return;
      }

      // Créer la demande avec l'ID du profil
      const { error } = await supabase
        .from('streamer_requests')
        .insert({
          user_id: profileId, // Utiliser l'ID du profil, pas de l'utilisateur auth
          twitch_username: formData.twitchUsername,
          stream_link: formData.streamLink,
          motivation: formData.motivation,
        });

      if (error) throw error;

      toast({
        title: "Demande envoyée !",
        description: "Votre demande pour devenir streamer a été envoyée. Vous serez notifié de la décision.",
      });

      navigate('/profil');
    } catch (error) {
      console.error('Error submitting streamer request:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Devenir Streamer</h1>
            <p className="text-muted-foreground">
              Rejoignez la communauté des streamers Pauvrathon et organisez vos propres subathons !
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Demande de Streamer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="twitchUsername">Nom d'utilisateur Twitch *</Label>
                  <Input
                    id="twitchUsername"
                    type="text"
                    value={formData.twitchUsername}
                    onChange={(e) => handleChange('twitchUsername', e.target.value)}
                    placeholder="votre_pseudo_twitch"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Votre nom d'utilisateur Twitch exact (sans le @)
                  </p>
                </div>

                <div>
                  <Label htmlFor="streamLink">Lien de votre chaîne Twitch *</Label>
                  <Input
                    id="streamLink"
                    type="url"
                    value={formData.streamLink}
                    onChange={(e) => handleChange('streamLink', e.target.value)}
                    placeholder="https://www.twitch.tv/votre_pseudo"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Le lien complet vers votre chaîne Twitch
                  </p>
                </div>

                <div>
                  <Label htmlFor="motivation">Motivation *</Label>
                  <Textarea
                    id="motivation"
                    value={formData.motivation}
                    onChange={(e) => handleChange('motivation', e.target.value)}
                    placeholder="Expliquez pourquoi vous souhaitez devenir streamer sur Pauvrathon..."
                    rows={6}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Décrivez vos projets de subathon et votre motivation (minimum 50 caractères)
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Critères d'éligibilité :</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Avoir un compte Twitch actif</li>
                    <li>• Prévoir d'organiser des subathons réguliers</li>
                    <li>• Respecter les règles de la communauté</li>
                    <li>• Être motivé à utiliser la plateforme Pauvrathon</li>
                  </ul>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || formData.motivation.length < 50}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer ma demande
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Après envoi, votre demande sera examinée par notre équipe. Vous recevrez une notification par email de la décision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}