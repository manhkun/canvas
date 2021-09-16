import ImageLayer from './ImageLayer';
import TextLayer from './TextLayer';

export interface PreviewerOption {
  width: number;
  height: number;
  elToLookup: string;
  zoom: {
    enable: boolean;
    on: 'hover';
    ratio: number;
  };
}

export type RenderBackgoundOption = {
  src: string;
  width?: DistanceMeasure;
  height?: DistanceMeasure;
} | string;

export interface BaseRenderOptions {
  id: string;
  order: number;
  width?: DistanceMeasure;
  height?: DistanceMeasure;
  position: Position;
  rotationAngle?: AngleMeasure;
  previewType?: 'mask' | 'dynamic';
  background?: RenderBackgoundOption;
  grayScale?: boolean;
  opacity: number;
  blending?:
  | 'normal'
  | 'lighter'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';
  customEffect?: Partial<CustomEffect>;
}

export interface ImageRenderOption extends BaseRenderOptions {
  type: 'image';
}

export interface TextRenderOption extends BaseRenderOptions {
  type: 'text',
  customEffect?: Partial<TextCustomEffect>;
  fontAutoFitWidth?: boolean;
}

export interface TextCustomEffect extends CustomEffect {
  curve: {
    radius: DistanceMeasure;
  }
}

export type RenderOptions = TextRenderOption | ImageRenderOption;

export interface RenderableImage {
  src: string;
  width?: number;
  height?: number;
  renderPos?: Point;
  rotationAngle?: number;
  rotateOrigin?: Point;
}

export interface BaseLayerOption {
  width?: number;
  height?: number;
  id: string;
  zIndex: number;
  position: NumberPosition;
  rotationAngle?: number;
  rotateOrigin?: Point;
  previewType?: 'mask' | 'dynamic';
  background?: RenderableImage | string;
  grayScale?: boolean;
  opacity: number;
  blending?:
  | 'normal'
  | 'lighter'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';
  customEffect?: Partial<CustomEffect>;
}

export interface TextLayerOption extends BaseLayerOption {
  type: 'text';
  customEffect?: Partial<TextLayerCustomEffect>;
  fontAutoFitWidth?: boolean;
}

export interface TextLayerCustomEffect extends CustomEffect {
  curve: {
    radius: number;
  }
}
export interface ImageLayerOption extends BaseLayerOption {
  type: 'image';
}

export type LayerOption = TextLayerOption | ImageLayerOption;

export interface CustomEffect {
  effect: string;
  width: number;
  shadow: ShadowEffectOptions;
  stroke: StrokeEffectOptions;
}

export interface StrokeEffectOptions {
  color: string;
}

export interface ShadowEffectOptions {
  blur: number;
  color: string;
  offsetX: number;
  offsetY: number;
}

export interface NumberPosition {
  x: number;
  y: number;
}

export interface Position {
  x: `${number}%`;
  y: `${number}%`;
}

export type DistanceMeasure = number | `${number}${'%' | 'px' | ''}`;
export type AngleMeasure = number | `${number}deg` | `${number}rad`;
export type RenderOptionMap = Record<string, RenderOptions>;

export type Point = [number, number];
export type Line = [number, number, number];

export type Box = [Point, Point, Point, Point];
export interface BoundingBox {
  box: Box;
  topLine: Line;
  bottomLine: Line;
  leftLine: Line;
  rightLine: Line;
}

export type LayerDataMap = Record<string, TextLayerData | ImageLayerData>;

export type LayerType = 'image' | 'text';
export type Layerdata = TextLayerData | ImageLayerData;
export interface ImageLayerData extends RenderableImage {
  type: 'image';
}

export interface TextLayerData {
  type: 'text';
  text: string;
  font?: string;
  size?: number;
  align: {
    horizontal?: 'right' | 'left' | 'center';
    vertical?: 'top' | 'bottom' | 'center';
  };
  color?: string;
}

export interface Alignment {
  vertical: 'top' | 'center' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
}

export type Layer = TextLayer | ImageLayer;
