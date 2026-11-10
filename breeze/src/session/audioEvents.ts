import type { SoundEngine } from '../audio/SoundEngine';
import type { AgeProfile } from '../core/profiles';
import type { GameEvent, WorldKind } from '../core/types';

interface AudioSessionState {
  world: WorldKind;
  profile: AgeProfile;
}

function playPondSound(sound: SoundEngine, names: Array<'pop' | 'bubble' | 'plop'>) {
  const name = names[Math.floor(Math.random() * names.length)];
  sound.play(name, { volume: 0.8, rate: 0.9 + Math.random() * 0.3 });
}

export function playGameEvent(event: GameEvent, state: AudioSessionState, sound: SoundEngine, onBigMoment?: () => void): void {
  switch (event.type) {
    case 'collect':
      if (state.world === 'pond') playPondSound(sound, ['pop', 'bubble', 'plop']);
      else sound.chime(event.n ?? 0);
      break;
    case 'ring':
      sound.play('magic', { volume: 0.8 });
      break;
    case 'bigMoment':
      sound.play(state.world === 'pond' ? 'jingle_steel' : state.world === 'sky' ? 'jingle_pizzi' : 'win', { volume: 0.9 });
    onBigMoment?.();
      break;
    case 'friend':
      sound.play(state.world === 'pond' ? 'boing' : 'swish', {
        volume: state.world === 'pond' ? 0.45 : 0.35,
        rate: state.world === 'pond' ? 0.9 + Math.random() * 0.2 : undefined,
      });
      break;
    case 'exhaleStart':
      if (state.world === 'pond') sound.play('bubble_pop', { volume: 0.3, rate: 1.2 });
      break;
    case 'exhaleEnd':
      if (event.good) sound.play(state.profile.key === 'little' ? 'xylo' : 'confirm', { volume: state.profile.key === 'little' ? 0.5 : 0.35 });
      break;
    case 'phase':
      if (event.phase === 'inhale' || event.phase === 'exhale') sound.playVoice(event.phase === 'inhale' ? 'breathe_in' : 'breathe_out');
      if (event.phase === 'inhale' && state.profile.showPacerText) sound.play('bell_soft', { volume: 0.12, rate: 0.7 });
      break;
    case 'sessionEnd':
      sound.play('complete', { volume: 0.9 });
      break;
  }
}
