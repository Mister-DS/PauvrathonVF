import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type TwitchEventType = 'sub' | 'bits' | 'gift';

interface TwitchEvent {
  streamer_id: string;
  event_type: TwitchEventType;
  bits?: number; // pour bits
  // autres champs selon besoin
}

export async function handleTwitchEvent(event: TwitchEvent) {
  // 1. Récupérer la config temps pour ce streamer et event_type
  const { data: config, error } = await supabase
    .from('streamer_event_time_settings')
    .select('time_seconds')
    .eq('streamer_id', event.streamer_id)
    .eq('event_type', event.event_type)
    .single();

  if (error || !config) {
    console.warn('Config temps non trouvée, utiliser valeur par défaut');
    // Valeurs par défaut si config absente
    config.time_seconds = event.event_type === 'bits' && event.bits
      ? Math.floor(event.bits / 100) * 10 // ex: 10s par 100 bits
      : event.event_type === 'sub'
      ? 60 // 1 min par sub par défaut
      : 30; // 30s par gift par défaut
  }

  let timeToAdd = config.time_seconds;

  // Pour bits, ajuster selon nombre de bits
  if (event.event_type === 'bits' && event.bits) {
    timeToAdd = Math.floor(event.bits / 100) * config.time_seconds;
  }

  // 2. Insérer dans time_additions
  const { error: insertError } = await supabase.from('time_additions').insert({
    streamer_id: event.streamer_id,
    type: event.event_type,
    seconds_added: timeToAdd,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Erreur insertion time_additions', insertError);
    throw insertError;
  }

  // 3. Mettre à jour current_timer (ex: incrémenter)
  // Récupérer current_timer actuel
  const { data: currentTimerData, error: timerError } = await supabase
    .from('current_timer')
    .select('seconds')
    .eq('streamer_id', event.streamer_id)
    .single();

  if (timerError) {
    console.error('Erreur récupération current_timer', timerError);
    throw timerError;
  }

  const newSeconds = (currentTimerData?.seconds || 0) + timeToAdd;

  const { error: updateError } = await supabase
    .from('current_timer')
    .upsert({
      streamer_id: event.streamer_id,
      seconds: newSeconds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'streamer_id' });

  if (updateError) {
    console.error('Erreur mise à jour current_timer', updateError);
    throw updateError;
  }
}