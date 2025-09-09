import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { User, Settings, Shield, LogOut, Menu, X, Heart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export function Navigation() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [hasStreamerProfile, setHasStreamerProfile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const navigationItems = [
    { path: '/decouverte', label: 'Découverte', show: !!user },
    { path: '/suivis', label: 'Suivis', show: !!user },
    { 
      path: '/demande-streamer', 
      label: 'Devenir Streamer', 
      show: !!user && !hasStreamerProfile && profile?.role !== 'streamer' && profile?.role !== 'admin' 
    },
    { 
      path: '/streamer', 
      label: 'Mon Panneau', 
      show: !!user && (profile?.role === 'streamer' || hasStreamerProfile || profile?.role === 'admin') 
    },
    { 
      path: '/admin', 
      label: 'Admin', 
      show: !!user && profile?.role === 'admin' 
    },
  ];

  const MobileMenu = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="flex flex-col space-y-4 mt-8">
          <Link to="/" className="text-2xl font-bold text-primary mb-6" onClick={() => setIsOpen(false)}>
            Pauvrathon
          </Link>
          
          {navigationItems.filter(item => item.show).map((item) => (
            <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}>
              <Button 
                variant={isActive(item.path) ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                {item.label}
              </Button>
            </Link>
          ))}
          
          {user && (
            <div className="border-t pt-4 mt-6">
              <Link to="/profil" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                  <SubscriptionBadge />
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { signOut(); setIsOpen(false); }}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start mt-2" 
                onClick={() => {
                  window.open(`https://www.paypal.com/donate/?business=dierickxsimon198%40gmail.com&no_recurring=0&currency_code=EUR`, '_blank');
                  setIsOpen(false);
                }}
              >
                <Heart className="mr-2 h-4 w-4 text-red-500" />
                Soutenir le dev
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold text-primary">
              Pauvrathon
            </Link>
            
            {/* Desktop Navigation */}
            {user && !isMobile && (
              <NavigationMenu>
                <NavigationMenuList className="space-x-2">
                  {navigationItems.filter(item => item.show).map((item) => (
                    <NavigationMenuItem key={item.path}>
                      <Link to={item.path}>
                        <Button 
                          variant={isActive(item.path) ? 'default' : 'ghost'}
                          size="sm"
                        >
                          {item.label}
                        </Button>
                      </Link>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Support Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.paypal.com/donate/?business=dierickxsimon198%40gmail.com&no_recurring=0&currency_code=EUR`, '_blank')}
              className="hidden sm:flex items-center"
            >
              <Heart className="mr-2 h-4 w-4 text-red-500" />
              Soutenir
            </Button>
            
            {/* Mobile Menu */}
            {user && isMobile && <MobileMenu />}
            
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
                    <SubscriptionBadge />
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