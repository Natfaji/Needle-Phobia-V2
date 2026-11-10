import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * Entry point. On the web, Skia's CanvasKit (WebAssembly, ~8 MB, cached after
 * the first load) must be loaded before any Skia component is imported, so the
 * real app is code-split behind <WithSkiaWeb />. On iOS/Android it is loaded
 * synchronously.
 */
function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#ffd166" size="large" />
      <Text style={styles.loadingText}>Getting the breeze ready…</Text>
    </View>
  );
}

let NativeRoot: React.ComponentType | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeRoot = require('./src/app/Root').default;
}

export default function App() {
  if (Platform.OS === 'web') {
    // Serve canvaskit.wasm from the same folder as index.html (see public/).
    const base = typeof window !== 'undefined' ? window.location.pathname.replace(/[^/]*$/, '') : '/';
    return (
      <WithSkiaWeb
        getComponent={() => import('./src/app/Root')}
        fallback={<Loading />}
        opts={{ locateFile: (file: string) => `${base}${file}` }}
      />
    );
  }
  return NativeRoot ? <NativeRoot /> : <Loading />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1020', gap: 16 },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 18 },
});
