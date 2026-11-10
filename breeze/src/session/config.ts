import { Platform } from 'react-native';
import { PROFILES } from '../core/profiles';
import type { AgeKey, InputKind } from '../core/types';
import type { SessionSettings } from './types';

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  age: 'kid',
  input: 'mic',
  sensitivity: 1,
  detail: true,
  sound: true,
  volume: 0.85,
  sessionSec: 180,
};

export function sessionSettingsFromUrl(): Partial<SessionSettings> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};

  const query = new URLSearchParams(window.location.search);
  const settings: Partial<SessionSettings> = {};
  const age = query.get('age');
  const input = query.get('input') ?? (query.get('sim') === '1' ? 'sim' : null);
  const minutes = Number(query.get('minutes'));
  const sensitivity = Number(query.get('sensitivity'));

  if (age && age in PROFILES) settings.age = age as AgeKey;
  if (input === 'mic' || input === 'touch' || input === 'sim') settings.input = input as InputKind;
  if (minutes >= 1 && minutes <= 10) settings.sessionSec = minutes * 60;
  if (query.get('detail') === '0') settings.detail = false;
  if (query.get('sound') === '0') settings.sound = false;
  if (sensitivity >= 0.4 && sensitivity <= 3) settings.sensitivity = sensitivity;

  return settings;
}
