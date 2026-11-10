import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AGE_KEYS, PROFILES } from '../core/profiles';
import type { AgeKey, InputKind } from '../core/types';
import type { HudState, SessionSettings } from '../session/types';
import { BigButton, GhostButton, Meter, Segmented, Stepper, Toggle } from './components';
import { colors, font, radius } from './theme';

interface Props {
  visible: boolean;
  settings: SessionSettings;
  onChange: (patch: Partial<SessionSettings>) => void;
  onClose: () => void;
  /** Live data when opened during a session. */
  hud?: HudState;
  inSession?: boolean;
  onRecalibrate?: () => void;
  onEndSession?: () => void;
  onBigMoment?: () => void;
  micError?: string | null;
}

/**
 * Nurse / caregiver panel. Opened with a long press (or three quick taps) on
 * the gear so a child cannot open it by accident. The exhale light lets the
 * clinician time the needle to a breath out, as in "blowing away shot pain"
 * (French et al. 1994).
 */
export function ClinicianPanel({ visible, settings, onChange, onClose, hud, inSession, onRecalibrate, onEndSession, onBigMoment, micError }: Props) {
  const levelNorm = hud ? (hud.levelDb + 90) / 90 : 0;
  const thrNorm = hud ? (hud.thresholdDb + 90) / 90 : 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ gap: 6 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Nurse settings</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {hud && inSession && (
              <View style={styles.liveBox}>
                <View style={[styles.exhaleLight, { backgroundColor: hud.isExhaling ? colors.ok : 'rgba(255,255,255,0.15)' }]}>
                  <Text style={styles.exhaleLightText}>{hud.isExhaling ? 'BREATHING OUT' : 'waiting'}</Text>
                </View>
                <Text style={styles.liveHint}>
                  {hud.isExhaling ? 'Good moment for the needle.' : 'The light turns green while the child breathes out.'}
                </Text>
                <Text style={styles.liveLabel}>Microphone level (marker = trigger threshold)</Text>
                <Meter value={levelNorm} marker={thrNorm} color={hud.isExhaling ? colors.ok : colors.kid} />
                <Text style={styles.liveStats}>
                  breaths {hud.stats.breaths} · calm breaths {hud.stats.goodBreaths} · longest out {(hud.stats.longestExhaleMs / 1000).toFixed(1)} s · {hud.stats.breathsPerMinute.toFixed(1)} / min · target out {hud.targetExhaleSec.toFixed(1)} s
                </Text>
                {micError && <Text style={styles.warn}>Mic: {micError}</Text>}
                <View style={styles.liveButtons}>
                  <GhostButton label="Re-learn room noise" onPress={() => onRecalibrate?.()} />
                  <GhostButton label="Trigger a celebration" onPress={() => onBigMoment?.()} />
                </View>
              </View>
            )}

            <Text style={styles.section}>Age group {inSession ? '(applies to the next game)' : ''}</Text>
            <Segmented<AgeKey>
              options={AGE_KEYS.map((k) => ({ key: k, label: `${PROFILES[k].label} · ${PROFILES[k].ages}` }))}
              value={settings.age}
              onChange={(age) => onChange({ age })}
            />
            <Text style={styles.section}>Input {inSession ? '(applies to the next game)' : ''}</Text>
            <Segmented<InputKind>
              options={[
                { key: 'mic', label: 'Microphone' },
                { key: 'touch', label: 'Touch only' },
                { key: 'sim', label: 'Demo' },
              ]}
              value={settings.input}
              onChange={(input) => onChange({ input })}
            />
            <Stepper
              label="Microphone sensitivity"
              value={settings.sensitivity}
              display={`${settings.sensitivity.toFixed(1)}×`}
              step={0.2}
              min={0.4}
              max={3}
              onChange={(sensitivity) => onChange({ sensitivity })}
            />
            <Stepper
              label="Game length"
              value={settings.sessionSec}
              display={`${Math.round(settings.sessionSec / 60)} min`}
              step={60}
              min={60}
              max={600}
              onChange={(sessionSec) => onChange({ sessionSec })}
            />
            <Toggle label="Sound" value={settings.sound} onChange={(sound) => onChange({ sound })} />
            <Stepper label="Volume" value={settings.volume} display={`${Math.round(settings.volume * 100)}%`} step={0.1} min={0} max={1} onChange={(volume) => onChange({ volume })} />
            <Toggle label="Rich graphics (turn off on an old tablet)" value={settings.detail} onChange={(detail) => onChange({ detail })} />

            <View style={styles.footer}>
              {inSession && <BigButton label="End game now" color={colors.danger} textColor="#fff" onPress={() => onEndSession?.()} />}
              <BigButton label="Done" onPress={onClose} />
            </View>
            <Text style={styles.foot}>
              Tips: a hand’s width from the mouth; gentle blowing, not hard; if the room is noisy raise the threshold by lowering sensitivity; if the child is crying, switch to Touch and hold the screen for them on each breath out.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '94%', backgroundColor: colors.panel, borderRadius: radius, padding: 20, borderWidth: 1, borderColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '900' },
  close: { color: colors.textDim, fontSize: 26, padding: 4 },
  section: { color: colors.textDim, fontSize: font.small, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  liveBox: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 8, marginTop: 10 },
  exhaleLight: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  exhaleLightText: { color: '#fff', fontSize: font.h2, fontWeight: '900', letterSpacing: 2 },
  liveHint: { color: colors.textDim, fontSize: font.small + 1, textAlign: 'center' },
  liveLabel: { color: colors.textDim, fontSize: font.small, marginTop: 4 },
  liveStats: { color: colors.text, fontSize: font.small + 1, lineHeight: 20 },
  liveButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  warn: { color: colors.danger, fontSize: font.small + 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 16 },
  foot: { color: colors.textDim, fontSize: font.small, marginTop: 14, lineHeight: 19 },
});
