import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius } from './theme';

export function BigButton({
  label,
  onPress,
  color = colors.accent,
  textColor = '#1a1400',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <Text style={[styles.bigButtonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.ghost, { opacity: pressed ? 0.7 : 1 }, style]}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  label,
  value,
  display,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{display}</Text>
        <Pressable onPress={() => onChange(Math.min(max, +(value + step).toFixed(2)))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Pressable onPress={() => onChange(!value)} style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </Pressable>
    </View>
  );
}

export function Meter({ value, marker, color = colors.ok }: { value: number; marker?: number; color?: string }) {
  return (
    <View style={styles.meter}>
      <View style={[styles.meterFill, { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, backgroundColor: color }]} />
      {marker !== undefined && <View style={[styles.meterMarker, { left: `${Math.round(Math.max(0, Math.min(1, marker)) * 100)}%` }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bigButton: {
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
  },
  bigButtonText: { fontSize: font.h2, fontWeight: '800', letterSpacing: 0.5 },
  ghost: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ghostText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.textDim, fontWeight: '700', fontSize: font.small + 1 },
  segmentTextActive: { color: '#1a1400' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: colors.text, fontSize: font.body, flex: 1, paddingRight: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: colors.text, fontSize: 24, fontWeight: '700' },
  stepValue: { color: colors.text, fontSize: font.body, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  toggle: { width: 58, height: 34, borderRadius: 17, backgroundColor: colors.card, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.ok },
  knob: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  meter: { height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', width: '100%' },
  meterFill: { height: '100%', borderRadius: 7 },
  meterMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.accent },
});
