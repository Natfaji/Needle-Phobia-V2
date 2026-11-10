import React, { useMemo } from 'react';
import { Canvas, Fill, Picture, Shader, Skia, type SkPicture, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { WorldKind } from '../core/types';
import { SHADER_BY_WORLD } from './shaders';

export interface ShaderUniforms {
  [name: string]: number | number[];
  uRes: number[];
  uTime: number;
  uBreath: number;
  uBloom: number;
  uProgress: number;
  uCalm: number;
  uScroll: number;
  uDetail: number;
  uCamera: number;
}

const effectCache: Partial<Record<WorldKind, SkRuntimeEffect>> = {};

export function getWorldEffect(world: WorldKind): SkRuntimeEffect {
  let e = effectCache[world];
  if (!e) {
    const made = Skia.RuntimeEffect.Make(SHADER_BY_WORLD[world]);
    if (!made) throw new Error(`Failed to compile ${world} shader`);
    e = made;
    effectCache[world] = e;
  }
  return e;
}

interface Props {
  world: WorldKind;
  width: number;
  height: number;
  picture: SharedValue<SkPicture>;
  uniforms: SharedValue<ShaderUniforms>;
}

/** Full-screen Skia canvas: shader background + the recorded world picture. */
export function GameCanvas({ world, width, height, picture, uniforms }: Props) {
  const effect = useMemo(() => getWorldEffect(world), [world]);
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={effect} uniforms={uniforms} />
      </Fill>
      <Picture picture={picture} />
    </Canvas>
  );
}
