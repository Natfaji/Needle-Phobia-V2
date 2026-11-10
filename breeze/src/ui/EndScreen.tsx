import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AgeProfile } from '../core/profiles';
import type { SessionStats } from '../core/types';
import { BigButton, GhostButton } from './components';
import { colors, font, radius } from './theme';

interface Props {
  stats: SessionStats;
  profile: AgeProfile;
  onAgain: () => void;
  onHome: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function EndScreen({ stats, profile, onAgain, onHome }: Props) {
  const headline = profile.key === 'little' ? 'Hooray! 🎉' : profile.key === 'kid' ? 'You did it! 🌟' : 'Nice work.';
  const sub =
    profile.key === 'little'
      ? 'Puff had so much fun with you!'
      : profile.key === 'kid'
        ? 'Every slow breath made the balloon fly. That was brave.'
        : 'Slow, steady exhales calm the body down. You just did that.';
  return (
    <ScrollView contentContainerStyle={styles.container} style={{ flex: 1 }}>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.sub}>{sub}</Text>
      {profile.showStats && (
        <View style={styles.stats}>
          <Stat label={profile.world === 'sky' ? 'stars' : 'orbs'} value={String(stats.stars)} />
          <Stat label="calm breaths" value={String(stats.goodBreaths)} />
          <Stat label="longest breath out" value={`${(stats.longestExhaleMs / 1000).toFixed(1)} s`} />
          {profile.key === 'teen' && <Stat label="breaths / min" value={stats.breathsPerMinute.toFixed(1)} />}
          {profile.key === 'teen' && <Stat label="calm score" value={`${Math.round(stats.calm * 100)}%`} />}
        </View>
      )}
      {!profile.showStats && <Text style={styles.bigEmoji}>🐠 🫧 ⭐ 🐢 🐋</Text>}
      <View style={styles.buttons}>
        <BigButton label="Play again" onPress={onAgain} />
        <GhostButton label="Choose another game" onPress={onHome} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  headline: { color: colors.text, fontSize: font.title, fontWeight: '900', textAlign: 'center' },
  sub: { color: colors.textDim, fontSize: font.h2, textAlign: 'center', maxWidth: 560 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 10 },
  stat: { backgroundColor: colors.card, borderRadius: radius, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center', minWidth: 150 },
  statValue: { color: colors.accent, fontSize: font.h1, fontWeight: '900' },
  statLabel: { color: colors.textDim, fontSize: font.small + 1 },
  bigEmoji: { fontSize: 40, marginVertical: 12 },
  buttons: { marginTop: 18, gap: 12, alignItems: 'center' },
});
