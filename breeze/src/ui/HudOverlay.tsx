import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { AgeProfile } from '../core/profiles';
import type { HudState } from '../session/types';
import { colors, font } from './theme';

interface Props {
  hud: HudState;
  profile: AgeProfile;
  micError: string | null;
  usingMic: boolean;
}

/** React Native overlay on top of the Skia canvas: prompts, score, timer, hints. */
export function HudOverlay({ hud, profile, micError, usingMic }: Props) {
  const toast = useRef(new Animated.Value(0)).current;
  const lastToast = useRef<string | null>(null);
  useEffect(() => {
    if (hud.encouragement && hud.encouragement !== lastToast.current) {
      lastToast.current = hud.encouragement;
      toast.setValue(0);
      Animated.sequence([
        Animated.timing(toast, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1100),
        Animated.timing(toast, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start(() => {
        lastToast.current = null;
      });
    }
  }, [hud.encouragement, toast]);

  const phaseColor = hud.phase === 'inhale' ? '#9ad8ff' : hud.phase === 'exhale' ? '#ffd166' : '#b4f0c8';
  const minutes = Math.floor(hud.timeLeft / 60);
  const seconds = Math.floor(hud.timeLeft % 60);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Top bar */}
      <View style={styles.topRow}>
        {profile.showStats ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {profile.world === 'sky' ? '⭐' : '◆'} {hud.stars}
            </Text>
          </View>
        ) : (
          <View />
        )}
        {profile.showPacerText && (
          <View style={styles.promptWrap}>
            <Text style={[styles.prompt, { color: phaseColor }]}>{hud.prompt}</Text>
            {profile.key === 'teen' && !hud.calibrating && (
              <Text style={styles.promptSub}>{hud.phase === 'exhale' ? `aim for ~${hud.targetExhaleSec.toFixed(0)} s, gentle and steady` : ' '}</Text>
            )}
          </View>
        )}
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Encouragement toast */}
      {profile.showPacerText && (
        <Animated.View style={[styles.toast, { opacity: toast, transform: [{ translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <Text style={styles.toastText}>{hud.encouragement ?? lastToast.current ?? ''}</Text>
        </Animated.View>
      )}

      {/* Teen calm meter */}
      {profile.key === 'teen' && (
        <View style={styles.calmWrap}>
          <Text style={styles.calmLabel}>calm</Text>
          <View style={styles.calmTrack}>
            <View style={[styles.calmFill, { width: `${Math.round(hud.calm * 100)}%` }]} />
          </View>
        </View>
      )}

      {/* Hints */}
      {micError && usingMic && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Microphone not available — hold a finger on the screen while you breathe out.</Text>
        </View>
      )}
      {!micError && hud.calibrating && profile.key !== 'little' && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Listening to the room…</Text>
        </View>
      )}

      {/* Session progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(hud.progress * 100)}%` }]} />
      </View>

      {hud.paused && (
        <View style={styles.pausedWrap}>
          <Text style={styles.pausedText}>Paused</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, paddingRight: 70 },
  pill: { backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, minWidth: 64, alignItems: 'center' },
  pillText: { color: colors.text, fontSize: font.body, fontWeight: '800', fontVariant: ['tabular-nums'] },
  promptWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  prompt: { fontSize: 30, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  promptSub: { color: 'rgba(255,255,255,0.8)', fontSize: font.small + 1, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  toast: { position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center' },
  toastText: { color: '#fff', fontSize: 34, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
  calmWrap: { position: 'absolute', right: 16, top: 70, width: 150, alignItems: 'flex-end' },
  calmLabel: { color: 'rgba(255,255,255,0.75)', fontSize: font.small, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  calmTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  calmFill: { height: '100%', backgroundColor: '#7ff0e0', borderRadius: 4 },
  hint: { position: 'absolute', bottom: 26, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, fontSize: font.body, textAlign: 'center' },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: 'rgba(0,0,0,0.25)' },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.75)' },
  pausedWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  pausedText: { color: '#fff', fontSize: 40, fontWeight: '900' },
});
