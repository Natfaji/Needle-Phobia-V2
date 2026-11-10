import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { PROFILES } from '../core/profiles';
import type { InputKind, SessionStats } from '../core/types';
import { DEFAULT_SESSION_SETTINGS, sessionSettingsFromUrl } from '../session/config';
import type { SessionSettings } from '../session/types';
import { ClinicianPanel } from '../ui/ClinicianPanel';
import { EndScreen } from '../ui/EndScreen';
import { GameScreen } from '../ui/GameScreen';
import { StartScreen } from '../ui/StartScreen';
import { colors } from '../ui/theme';
import { Runtime } from './Runtime';

type Screen = 'start' | 'play' | 'end';

export default function Root() {
  const runtime = useRef<Runtime | null>(null);
  if (!runtime.current) runtime.current = new Runtime();
  const rt = runtime.current;

  const [settings, setSettings] = useState<SessionSettings>(() => ({ ...DEFAULT_SESSION_SETTINGS, ...sessionSettingsFromUrl() }));
  const [screen, setScreen] = useState<Screen>('start');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (screen !== 'start' || !settings.sound) return;
    const timer = setTimeout(() => {
      void rt.sound.unlock().then(() => rt.sound.playVoice('press_start'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [rt, screen, settings.sound]);

  const onChange = useCallback(
    (patch: Partial<SessionSettings>) => {
      setSettings((s) => {
        const next = { ...s, ...patch };
        if ((patch.age && patch.age !== s.age) || (patch.input && patch.input !== s.input)) {
          if (next.sound) {
          void rt.sound.unlock().then(() => rt.sound.playVoice('press_start'));
          }
        }
        return next;
      });
    },
    [rt],
  );

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      await rt.start(settings.input, PROFILES[settings.age], settings.sound);
      if (settings.sound) rt.sound.play('ui_tap', { volume: 0.5 });
      setSessionKey((k) => k + 1);
      setScreen('play');
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Could not start. Try "Hold the screen" mode.');
    } finally {
      setStarting(false);
    }
  }, [rt, settings]);

  const onEnd = useCallback(
    (s: SessionStats) => {
      setStats(s);
      rt.stop();
      setScreen('end');
    },
    [rt],
  );

  const profile = useMemo(() => PROFILES[settings.age], [settings.age]);
  const inputForRun: InputKind = settings.input;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {screen === 'start' && (
        <StartScreen settings={settings} onChange={onChange} onStart={start} onOpenSettings={() => setPanel(true)} starting={starting} error={error} />
      )}
      {screen === 'play' && <GameScreen key={sessionKey} runtime={rt} settings={{ ...settings, input: inputForRun }} onChange={onChange} onEnd={onEnd} />}
      {screen === 'end' && stats && (
        <EndScreen
          stats={stats}
          profile={profile}
          onAgain={() => {
            void start();
          }}
          onHome={() => setScreen('start')}
        />
      )}
      <ClinicianPanel visible={panel} settings={settings} onChange={onChange} onClose={() => setPanel(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
