export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  twitch_id?: string;
  twitch_username?: string;
  twitch_display_name?: string;
  avatar_url?: string;
  role: 'viewer' | 'streamer' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface StreamerRequest {
  id: string;
  user_id: string;
  twitch_username: string;
  stream_link: string;
  motivation: string;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  profiles?: {
    twitch_display_name?: string;
    avatar_url?: string;
  };
}

export interface Streamer {
  id: string;
  user_id: string;
  twitch_id: string;
  time_increment: number;
  clicks_required: number;
  cooldown_seconds: number;
  active_minigames: string[];
  current_clicks: number;
  total_time_added: number;
  is_live: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile | null;
}

export interface SubathonStats {
  id: string;
  streamer_id: string;
  player_twitch_username?: string;
  clicks_contributed: number;
  games_won: number;
  games_played: number;
  time_contributed: number;
  last_activity: string;
  created_at: string;
}

export interface Minigame {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface GameSession {
  id: string;
  streamer_id: string;
  player_twitch_username?: string | null;
  minigame_name: string;
  status: string;
  attempts: number;
  max_attempts: number;
  game_data?: any;
  started_at: string;
  completed_at?: string | null;
}