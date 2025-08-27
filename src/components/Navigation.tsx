import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { User, Settings, Shield, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Navigation() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [hasStreamerProfile, setHasStreamerProfile] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const checkStreamerProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('streamers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        setHasStreamerProfile(!!data && !error);
      } catch (error) {
        setHasStreamerProfile(false);
      }
    };

    checkStreamerProfile();
  }, [user, profile]);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold text-primary">
              Pauvrathon
            </Link>
            
            {user && (
              <NavigationMenu>
                <NavigationMenuList className="space-x-2">
                  <NavigationMenuItem>
                    <Link to="/decouverte">
                      <Button 
                        variant={isActive('/decouverte') ? 'default' : 'ghost'}
                        size="sm"
                      >
                        Découverte
                      </Button>
                    </Link>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Link to="/suivis">
                      <Button 
                        variant={isActive('/suivis') ? 'default' : 'ghost'}
                        size="sm"
                      >
                        Suivis
                      </Button>
                    </Link>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Link to="/demande-streamer">
                      <Button 
                        variant={isActive('/demande-streamer') ? 'default' : 'ghost'}
                        size="sm"
                      >
                        Devenir Streamer
                      </Button>
                    </Link>
                  </NavigationMenuItem>
                  
                  {(profile?.role === 'streamer' || hasStreamerProfile || profile?.role === 'admin') && (
                    <NavigationMenuItem>
                      <Link to="/streamer">
                        <Button 
                          variant={isActive('/streamer') ? 'default' : 'ghost'}
                          size="sm"
                        >
                          Mon Panneau
                        </Button>
                      </Link>
                    </NavigationMenuItem>
                  )}
                  
                  {profile?.role === 'admin' && (
                    <NavigationMenuItem>
                      <Link to="/admin">
                        <Button 
                          variant={isActive('/admin') ? 'default' : 'ghost'}
                          size="sm"
                        >
                          Admin
                        </Button>
                      </Link>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.twitch_display_name || 'User'} />
                      <AvatarFallback>
                        {profile?.twitch_display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link to="/profil" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profil
                    </Link>
                  </DropdownMenuItem>
                  {(profile?.role === 'streamer' || hasStreamerProfile || profile?.role === 'admin') && (
                    <DropdownMenuItem asChild>
                      <Link to="/streamer" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Panneau Streamer
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button>Se connecter</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}