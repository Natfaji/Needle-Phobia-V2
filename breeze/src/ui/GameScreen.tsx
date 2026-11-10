import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import type { Runtime } from '../app/Runtime';
import type { SessionStats } from '../core/types';
import { useGameSession } from '../hooks/useGameSession';
import type { SessionSettings } from '../session/types';
import { GameCanvas } from '../render/GameCanvas';
import { ClinicianPanel } from './ClinicianPanel';
import { HudOverlay } from './HudOverlay';
import { BigButton, GhostButton } from './components';
import { colors, font, radius } from './theme';

interface Props {
  runtime: Runtime;
  settings: SessionSettings;
  onChange: (patch: Partial<SessionSettings>) => void;
  onEnd: (stats: SessionStats) => void;
}

export function GameScreen({ runtime, settings, onChange, onEnd }: Props) {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  const { width, height } = useWindowDimensions();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraBackground = cameraPermission?.granted ?? false;
  const { picture, uniforms, hud, controls, profile } = useGameSession(runtime, settings, { width, height }, cameraBackground);
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  // Leave a moment for the final celebration before showing the summary.
  useEffect(() => {
    if (!hud.done) return;
    const t = setTimeout(() => onEnd(controls.stats()), 2600);
    return () => clearTimeout(t);
  }, [hud.done, controls, onEnd]);

  const openMenu = () => {
    controls.pause();
    setMenu(true);
  };
  const closeMenu = () => {
    setMenu(false);
    if (!panel) controls.resume();
  };

  return (
    <View style={styles.root}>
      {cameraPermission?.granted && <CameraView style={StyleSheet.absoluteFill} facing="back" />}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={() => controls.setTouch(true)}
        onPressOut={() => controls.setTouch(false)}
        accessibilityLabel="Game area. Hold to blow."
      >
        <GameCanvas
          world={profile.world}
          width={width}
          height={height}
          picture={picture}
          uniforms={uniforms}
        />
      </Pressable>
      <HudOverlay hud={hud} profile={profile} micError={runtime.micError} usingMic={settings.input === 'mic'} />

      <Pressable
        accessibilityLabel="Pause"
        onPress={openMenu}
        onLongPress={() => {
          controls.pause();
          setPanel(true);
        }}
        style={styles.pauseBtn}
        hitSlop={10}
      >
        <Text style={styles.pauseText}>❚❚</Text>
      </Pressable>

      {menu && (
        <View style={styles.menuBackdrop}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Paused</Text>
            <BigButton label="Keep playing" onPress={closeMenu} />
            <GhostButton
              label="Nurse settings"
              onPress={() => {
                setMenu(false);
                setPanel(true);
              }}
            />
            <GhostButton
              label="Finish now"
              onPress={() => {
                setMenu(false);
                controls.resume();
                controls.end();
              }}
            />
          </View>
        </View>
      )}

      <ClinicianPanel
        visible={panel}
        settings={settings}
        onChange={onChange}
        hud={hud}
        inSession
        micError={runtime.micError}
        onRecalibrate={controls.recalibrate}
        onBigMoment={controls.bigMoment}
        onEndSession={() => {
          setPanel(false);
          controls.resume();
          controls.end();
        }}
        onClose={() => {
          setPanel(false);
          controls.resume();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  pauseBtn: { position: 'absolute', top: 12, right: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  pauseText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  menuBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  menu: { backgroundColor: colors.panel, borderRadius: radius, padding: 24, gap: 12, alignItems: 'center', minWidth: 280, borderWidth: 1, borderColor: colors.border },
  menuTitle: { color: colors.text, fontSize: font.h1, fontWeight: '900', marginBottom: 6 },
});
