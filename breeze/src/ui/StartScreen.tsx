import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AGE_KEYS, PROFILES } from '../core/profiles';
import type { AgeKey, InputKind } from '../core/types';
import type { SessionSettings } from '../session/types';
import { BigButton, Segmented } from './components';
import { colors, font, radius } from './theme';

const ICON: Record<AgeKey, string> = { little: '🐠', kid: '🎈', teen: '☄️' };
const COLOR: Record<AgeKey, string> = { little: colors.little, kid: colors.kid, teen: colors.teen };
const WORLD_NAME: Record<AgeKey, string> = { little: 'Bubble Pond', kid: 'Sky Sailor', teen: 'Nebula Drift' };

interface Props {
  settings: SessionSettings;
  onChange: (patch: Partial<SessionSettings>) => void;
  onStart: () => void;
  onOpenSettings: () => void;
  starting: boolean;
  error: string | null;
}

export function StartScreen({ settings, onChange, onStart, onOpenSettings, starting, error }: Props) {
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const [pressCount, setPressCount] = useState(0);
  const profile = PROFILES[settings.age];
  return (
    <ScrollView contentContainerStyle={styles.container} style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Breeze</Text>
        <Text style={styles.subtitle}>Your breath is the wind.</Text>
        <Pressable
          accessibilityLabel="Nurse settings"
          onLongPress={onOpenSettings}
          onPress={() => {
            setPressCount((c) => {
              if (c + 1 >= 3) {
                onOpenSettings();
                return 0;
              }
              return c + 1;
            });
          }}
          style={styles.gear}
        >
          <Text style={styles.gearText}>⚙︎</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Who is playing?</Text>
      <View style={[styles.cards, narrow && { flexDirection: 'column' }]}>
        {AGE_KEYS.map((key) => {
          const p = PROFILES[key];
          const active = settings.age === key;
          return (
            <Pressable
              key={key}
              onPress={() => onChange({ age: key })}
              style={[styles.card, active && { borderColor: COLOR[key], backgroundColor: colors.cardActive }]}
            >
              <Text style={styles.cardIcon}>{ICON[key]}</Text>
              <Text style={[styles.cardTitle, active && { color: COLOR[key] }]}>{p.label}</Text>
              <Text style={styles.cardAges}>{p.ages}</Text>
              <Text style={styles.cardWorld}>{WORLD_NAME[key]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.tagline}>{profile.tagline}</Text>

      <Text style={styles.sectionLabel}>How do you blow?</Text>
      <View style={{ maxWidth: 520, width: '100%' }}>
        <Segmented<InputKind>
          options={[
            { key: 'mic', label: 'Microphone' },
            { key: 'touch', label: 'Hold the screen' },
            { key: 'sim', label: 'Demo' },
          ]}
          value={settings.input}
          onChange={(input) => onChange({ input })}
        />
        <Text style={styles.hint}>
          {settings.input === 'mic'
            ? 'Hold the tablet about a hand’s width from your mouth and blow gently — like cooling a spoon of soup. Holding a finger on the screen also works.'
            : settings.input === 'touch'
              ? 'Press and hold anywhere on the screen while breathing out. Let go when you breathe in.'
              : 'The game breathes by itself — for showing it to a child before their turn.'}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={{ marginTop: 20, alignItems: 'center' }}>
        {starting ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : (
          <BigButton label={settings.age === 'little' ? 'Play with Puff  ▶' : 'Start  ▶'} onPress={onStart} color={COLOR[settings.age]} textColor="#08101f" />
        )}
      </View>
      <Text style={styles.footer}>Breathe in gently, not a big breath. Blow out slowly. Stop any time — there is no way to lose.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, alignItems: 'center', gap: 10, minHeight: '100%' },
  header: { alignItems: 'center', width: '100%', marginBottom: 6 },
  title: { color: colors.text, fontSize: font.title, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: colors.textDim, fontSize: font.h2, marginTop: 2 },
  gear: { position: 'absolute', right: 0, top: 0, padding: 10 },
  gearText: { color: colors.textDim, fontSize: 26 },
  sectionLabel: { color: colors.textDim, fontSize: font.small + 1, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 14 },
  cards: { flexDirection: 'row', gap: 14, justifyContent: 'center', width: '100%', maxWidth: 900 },
  card: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  cardIcon: { fontSize: 44 },
  cardTitle: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  cardAges: { color: colors.textDim, fontSize: font.body },
  cardWorld: { color: colors.textDim, fontSize: font.small, fontStyle: 'italic' },
  tagline: { color: colors.text, fontSize: font.body, textAlign: 'center', maxWidth: 560 },
  hint: { color: colors.textDim, fontSize: font.small + 1, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  error: { color: colors.danger, fontSize: font.body, textAlign: 'center', marginTop: 8 },
  footer: { color: colors.textDim, fontSize: font.small, textAlign: 'center', marginTop: 24, maxWidth: 520 },
});
