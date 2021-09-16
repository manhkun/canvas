import {
  DistanceMeasure, AngleMeasure, LayerOption, RenderOptionMap, RenderOptions, TextCustomEffect,
} from './type';

export function isColor(str: string): boolean {
  return str.startsWith('#');
}
export function parseMeasure(m: DistanceMeasure, base: number): number {
  if (m === undefined) return 0;
  if (typeof m === 'number') return m;
  if (m.endsWith('px')) return parseFloat(m.split('px')[0]);
  if (m.endsWith('%')) return (parseFloat(m.split('%')[0]) / 100) * base;
  if (!Number.isNaN(parseFloat(m))) return parseFloat(m);
  return 0;
}

export function parseAngle(a: AngleMeasure): number {
  if (!a) return 0;
  if (typeof a === 'number') return a;
  if (a.endsWith('deg')) return parseFloat(a.split('deg')[0]) / 180 * Math.PI;
  if (a.endsWith('rad')) return parseFloat(a.split('rad')[0]);
  if (!Number.isNaN(parseFloat(a))) return parseFloat(a);
  return 0;
}

export function mapRenderOptionToLayerOption(renderOption: RenderOptions, w: number, h:number): LayerOption {
  const {
    position: { x, y }, width, height, background, type, customEffect, rotationAngle,
  } = renderOption;
  let nW; let
    nH;
  if (width) nW = parseMeasure(width, w);
  if (height) nH = parseMeasure(height, h);
  let bg: LayerOption['background'];

  if (background) {
    if (typeof background === 'object') {
      const { width: bWidth, height: bHeight } = background;
      bg = {
        ...background,
        width: bWidth ? parseMeasure(bWidth, w) : undefined,
        height: bHeight ? parseMeasure(bHeight, h) : undefined,
      };
    } else {
      bg = background;
    }
  }

  let cE = customEffect || undefined;
  if (cE) {
    switch (type) {
      case 'text':
      {
        const { curve } = cE as TextCustomEffect;
        if (!curve) break;
        const { radius } = curve;
        const nR = parseMeasure(radius, h);
        cE = { ...cE, curve: { radius: nR } } as TextCustomEffect;
        break;
      }
      default:
        break;
    }
  }

  const angle = parseAngle(rotationAngle || 0);

  return {
    ...renderOption,
    zIndex: renderOption.order,
    position: {
      x: parseMeasure(x, w),
      y: parseMeasure(y, h),
    },
    height: nH,
    width: nW,
    background: bg,
    customEffect: cE,
    rotationAngle: angle,
  };
}

export function mapOptionRenderMaptoLayerMap(rMap: RenderOptionMap, w: number, h: number): Record<string, LayerOption> {
  return Object.entries(rMap).reduce<Record<string, LayerOption>>((layerMap, [id, renderOption]) => {
    layerMap[id] = mapRenderOptionToLayerOption(renderOption, w, h);
    return layerMap;
  }, {
  });
}

export function mapRenderOptionListTorLayerList(rList:RenderOptions[], w: number, h: number): LayerOption[] {
  return rList.map((r) => mapRenderOptionToLayerOption(r, w, h));
}

export function round<T extends number | number[]>(n: T):T {
  if (typeof n === 'number') return Math.round(n) as T;
  return n.map(Math.round) as T;
}
