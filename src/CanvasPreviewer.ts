// @ts-nocheck
import Canvas from './Canvas';
import CanvasUtils from './CanvasUtils';
import { HorizontalTransitionOrigin, ScaleOrigin, VerticalTransitionOrigin } from './CanvasLayer';
import {
  PreviewerOption, LayerDataMap, Point, Layer, TextLayerData,
} from './type';

export type CanvasMode = 'DEFAULT' | 'FOCUS' | 'MOVE' | 'V-RESIZE' | 'H-RESIZE' | 'SCALE' | 'ROTATE';

export interface WithMousePos {
  point: Point;
}

export interface ActionAtMousePos { mode: CanvasMode, point: Point, data?: Partial<{ vTO: VerticalTransitionOrigin; hTO: HorizontalTransitionOrigin; sO: ScaleOrigin }> }

// const CLASSMAP = {
//   CONTAINER: 'cp-container',
// };

export interface StringOnly {
  [k: string]: string;
}

export interface StringOnlyRecursive {
  [k: string]: string | StringOnlyRecursive;
}

// function addText<T extends StringOnlyRecursive>(obj: T, textToAdd = '', mode: 'append' | 'prepend' = 'prepend'): T {
//   const out = {} as any;
//   Object.keys(obj).forEach((key) => {
//     if (typeof obj[key] === 'string') {
//       if (mode === 'append') out[key] = obj[key] + textToAdd;
//       else out[key] = textToAdd + obj[key];
//     } else if (typeof obj[key] === 'object') {
//       out[key] = addText(obj[key] as StringOnlyRecursive, textToAdd, mode);
//     }
//   });

//   return out;
// }

// const SELECTORMAP = addText<typeof CLASSMAP>(CLASSMAP, '.', 'prepend');

export class CanvasPreviewer extends Canvas {
  layerMap: Record<string, Layer> = {};

  allowZoom = false;

  zoomFactor = 3;

  mode: CanvasMode = 'DEFAULT';

  moveTriggerPoint: Point = [0, 0];

  moveAdjustDistances: [number, number] = [0, 0];

  verticalTransitionOrigin: VerticalTransitionOrigin = 'top';

  horizontalTransitionOrigin: HorizontalTransitionOrigin = 'left';

  scaleOrigin: ScaleOrigin = 'top left';

  rotateTriggerPoint: Point = [0, 0];

  rotateAdjustAngle = 0;

  rotateError = 16;

  scaleError = 6;

  resizeError = 8;

  /**
   * key to trigger operation with keepAspect flag
   */
  aspectScalingKey: keyof MouseEvent = 'shiftKey';

  /**
   * key to trigger operation in both side
   */
  symetricScalingKey: keyof MouseEvent = 'altKey';

  constructor(el: HTMLCanvasElement, option: PreviewerOption) {
    const {
      width, height, zoom,
    } = option;
    super(width, height, el);
    this.setupDOM();
    if (zoom.enable) {
      this.allowZoom = true;
      this.setupEvents(zoom.on, zoom.ratio);
    }
    window.addEventListener('resize', () => this.render());
  }

  _focusingId: string | null = null;

  set focusingId(id: string | null) {
    if (id === this._focusingId) return;
    this._focusingId = id;
    this.render();
  }

  get focusingId(): string | null {
    return this._focusingId;
  }

  _hoveringId: string | null = null;

  set hoveringId(id: string | null) {
    if (id === this._hoveringId) return;
    this._hoveringId = id;
    if (this.focusingId) return;
    this.render();
  }

  /**
   * layerId under the cursor when mode === 'DEFAULT'
   */
  get hoveringId(): string | null {
    return this._hoveringId;
  }

  get isMovingLayer(): boolean {
    return this.mode === 'MOVE';
  }

  get isResizingLayer(): boolean {
    return this.mode.includes('RESIZE');
  }

  get isAdjustingLayer(): boolean {
    return !!this.focusingId && !['DEFAULT', 'FOCUS'].includes(this.mode);
  }

  get focusingLayer(): Layer | undefined {
    if (this.focusingId === null) return undefined;
    return this.layerMap[this.focusingId];
  }

  get isHoveringLayer(): boolean {
    return this.hoveringId !== null;
  }

  get hoveringLayer(): Layer | undefined {
    if (this.hoveringId === null) return undefined;
    return this.layerMap[this.hoveringId];
  }

  get layers(): Layer[] {
    return Object.values(this.layerMap).sort((l1, l2) => l2.zIndex - l1.zIndex);
  }

  get orderByIndexAscLayers(): Layer[] {
    return Object.values(this.layerMap).sort((l1, l2) => l1.zIndex - l2.zIndex);
  }

  get scaleFactor(): [number, number] {
    const {
      width, height, clientWidth, clientHeight,
    } = this.el;
    return [width / clientWidth, height / clientHeight];
  }

  addLayers(...layers: Layer[]): void {
    layers.forEach((layer) => {
      layer.onFragmentLoad = () => {
        this.render();
      };
      layer.onUpdate = () => {
        this.render();
      };
      this.layerMap[layer.id] = layer;
    });
  }

  setupDOM(): void {
  }

  findLayerUnderPoint(p: Point): Layer | null {
    for (let i = 0; i < this.layers.length; i += 1) {
      if (this.layers[i].isRenderedPointInBox(p)) {
        return this.layers[i];
      }
    }
    return null;
  }

  setupEvents(_ = 'hover', ratio: number): void {
    this.zoomFactor = ratio;
    this.el.addEventListener('mousemove', (e) => {
      const point: Point = CanvasUtils.getMousePos(
        e,
        this.el,
        this.scaleFactor,
      );
      switch (this.mode) {
        case 'MOVE': {
          const layer = this.focusingLayer;
          if (!layer) return;
          const [dx, dy] = this.moveAdjustDistances;
          const nP: Point = [point[0] - dx, point[1] - dy];
          layer.moveToRenderedPos(nP);
          return;
        }

        case 'H-RESIZE': {
          let { horizontalTransitionOrigin } = this;
          if (e[this.symetricScalingKey]) horizontalTransitionOrigin = 'center';
          const layer = this.focusingLayer;
          if (!layer) return;
          layer.horizontalResizeToParentPos(point, horizontalTransitionOrigin, !!e[this.aspectScalingKey]);
          return;
        }

        case 'V-RESIZE': {
          let { verticalTransitionOrigin } = this;
          if (e[this.symetricScalingKey]) verticalTransitionOrigin = 'center';
          const layer = this.focusingLayer;
          if (!layer) return;
          layer.verticalResizeToParentPos(point, verticalTransitionOrigin, !!e[this.aspectScalingKey]);
          return;
        }

        case 'SCALE': {
          let { scaleOrigin } = this;
          if (e[this.symetricScalingKey]) scaleOrigin = 'center center';
          const layer = this.focusingLayer;
          if (!layer) return;
          layer.scaleToParentPos(point, scaleOrigin, !!e[this.aspectScalingKey]);
          return;
        }

        case 'ROTATE': {
          const triggerPoint = this.rotateTriggerPoint;
          const layer = this.focusingLayer;
          if (!layer) return;
          const center = layer.renderCenterPos;
          const centerOnParent = layer.getRenderedPosFromPos(center);
          const triggerAndLayerAngle = CanvasUtils.getAngleWithOx(
            triggerPoint,
            centerOnParent,
          );
          const currentAndLayerAngle = CanvasUtils.getAngleWithOx(
            point,
            centerOnParent,
          );
          const angle = currentAndLayerAngle - triggerAndLayerAngle;
          const newRotateAngle = angle + layer.rotationAngle - this.rotateAdjustAngle;
          layer.rotate(newRotateAngle);
          this.rotateAdjustAngle = angle;
          return;
        }

        default: {
          if (this.mode === 'FOCUS') {
            const { mode } = this.getActionOnFocusingLayer(point);
            if (mode === 'DEFAULT') {
              this.el.style.cursor = 'default';
              return;
            }
            if (mode === 'FOCUS') {
              this.el.style.cursor = 'default';
              return;
            }
            if (mode === 'MOVE') {
              this.el.style.cursor = 'move';
              return;
            }
            this.el.style.cursor = 'grab';
            return;
          }
          const foundLayer = this.findLayerUnderPoint(point);
          if (foundLayer) {
            this.hoveringId = foundLayer.id;
          } else {
            this.hoveringId = null;
            this.switchMode('DEFAULT');
          }
        }
      }
    });

    this.el.addEventListener('mouseup', () => {
      if (this.isAdjustingLayer && this.focusingId) {
        this.switchMode('FOCUS');
        return;
      }
      if (this.hoveringId !== null) {
        this.switchMode('FOCUS', this.hoveringId);
        return;
      }

      this.switchMode('DEFAULT');
    });

    this.el.addEventListener('mousedown', (e) => {
      if (!this.focusingId) return;
      const point = CanvasUtils.getMousePos(e, this.el, this.scaleFactor);
      const action = this.getActionOnFocusingLayer(point);
      const { mode, point: triggerPoint, data } = action;
      switch (action.mode) {
        case 'SCALE': {
          if (data) this.scaleOrigin = data.sO || this.scaleOrigin;
          break;
        }
        case 'H-RESIZE': {
          if (data) this.horizontalTransitionOrigin = data.hTO || this.horizontalTransitionOrigin;
          break;
        }
        case 'V-RESIZE': {
          if (data) this.verticalTransitionOrigin = data.vTO || this.verticalTransitionOrigin;
          break;
        }
        default:
          break;
      }
      this.switchMode(mode, undefined, triggerPoint);
    });

    this.el.addEventListener('mouseleave', (__) => {
      if (this.mode !== 'DEFAULT') this.switchMode('FOCUS');
      else this.switchMode('DEFAULT');
    });
  }

  isValidIndex(index: string | null): boolean {
    if (index === null) return false;
    return !!this.layerMap[index];
  }

  resetAdjustment(): void {
    this.moveAdjustDistances = [0, 0];
    this.rotateAdjustAngle = 0;
  }

  switchMode(mode: CanvasMode, index?: string, at?: Point): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (this.mode !== 'DEFAULT') this.hoveringId = null;
    if (typeof index === 'string' && this.isValidIndex(index)) this.focusingId = index;
    switch (this.mode) {
      case 'DEFAULT':
        this.focusingId = null;
        this.resetAdjustment();
        break;
      case 'MOVE':
        if (at) {
          this.moveTriggerPoint = at;
          if (this.focusingLayer) {
            const [x, y] = at;
            const [x1, y1] = this.focusingLayer.getRenderedPosFromPos(
              this.focusingLayer.renderCenterPos,
            );
            this.moveAdjustDistances = [x - x1, y - y1];
          }
        }
        break;
      case 'ROTATE':
        if (!at) return;
        this.rotateTriggerPoint = at;
        break;
      case 'FOCUS':
        this.resetAdjustment();
        break;
      default:
        break;
    }
    if (this.mode === 'DEFAULT') this.el.style.cursor = 'default';
    if (this.isAdjustingLayer) this.el.style.cursor = 'grabbing';
  }

  getActionOnFocusingLayer(point: Point): ActionAtMousePos {
    const layer = this.focusingLayer;
    const { abs } = Math;
    if (!layer) return { mode: 'DEFAULT', point };
    const pointOnLayer = layer.getPosFromRenderedPos(point);
    const [x, y] = pointOnLayer;
    const { scaleError, rotateError, resizeError } = this;
    let hTO: HorizontalTransitionOrigin | undefined;
    let vTO: VerticalTransitionOrigin | undefined;
    let sO: ScaleOrigin | undefined;
    const {
      box: [A, B, C, D],
    } = layer.boundingBox;
    const [aX, aY] = A;
    const [bX, bY] = B;
    const [cX, cY] = C;
    const [dX, dY] = D;
    const { renderWidth, renderHeight } = layer;
    if (
      !CanvasUtils.isPointInRect(
        pointOnLayer,
        [aX - rotateError, aY - rotateError],
        renderWidth + 2 * rotateError,
        renderHeight + 2 * rotateError,
      )
    ) {
      // this.switchMode('DEFAULT');
      return { point, mode: 'DEFAULT' };
    }
    /**
     * If pointOnLayer out of corner => rotate
     */
    let shouldRotate = false;
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [aX - rotateError, aY - rotateError],
        rotateError,
        rotateError,
      )
    ) shouldRotate = true;
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [bX, bY - rotateError],
        rotateError,
        rotateError,
      )
    ) shouldRotate = true;
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [cX, cY],
        rotateError,
        rotateError,
      )
    ) shouldRotate = true;
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [dX - rotateError, dY],
        rotateError,
        rotateError,
      )
    ) shouldRotate = true;
    /**
     * rotate begins at this point
     */
    if (shouldRotate) {
      // this.switchMode('ROTATE', undefined, point);
      return { mode: 'ROTATE', point };
    }

    /**
     * if pointOnLayer at corner
     */
    if (CanvasUtils.isPointInRect(pointOnLayer, A, scaleError, scaleError)) sO = 'bottom right';
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [bX - scaleError, bY],
        scaleError,
        scaleError,
      )
    ) sO = 'bottom left';
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [cX - scaleError, cY - scaleError],
        scaleError,
        scaleError,
      )
    ) sO = 'top left';
    if (
      CanvasUtils.isPointInRect(
        pointOnLayer,
        [dX, dY - scaleError],
        scaleError,
        scaleError,
      )
    ) sO = 'top right';

    /**
     * if scaleOrigin => scale
     */
    if (sO) {
      return { mode: 'SCALE', point, data: { sO } };
    }

    if (!layer.isRenderedPointInBox(point)) return { mode: 'DEFAULT', point };

    if (abs(x - aX) < resizeError) hTO = 'right';
    if (abs(x - bX) < resizeError) hTO = 'left';
    if (abs(y - aY) < resizeError) vTO = 'bottom';
    if (abs(y - cY) < resizeError) vTO = 'top';

    /**
     * horizontal resize
     */
    if (hTO) {
      return { point, mode: 'H-RESIZE', data: { hTO } };
    }

    /**
     * vertical resize
     */
    if (vTO) {
      return { point, mode: 'V-RESIZE', data: { vTO } };
    }

    /**
     * move
     */
    return { point, mode: 'MOVE' };
  }

  renderBoundingBox(layer: Layer): void {
    const { ctx, scaleFactor: [fX] } = this;
    let { scaleError } = this;
    scaleError *= fX;
    if (!ctx) return;
    const {
      boundingBox: {
        box: [A, B, C, D],
      },
      rotateOrigin: [x, y],
      rotationAngle: angle,
    } = layer;
    const [aX, aY] = A;
    const [bX, bY] = B;
    const [cX, cY] = C;
    const [dX, dY] = D;
    ctx.save();
    ctx.lineWidth = 2 * fX;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-x, -y);
    ctx.strokeStyle = 'blueviolet';
    ctx.strokeRect(aX, aY, scaleError, scaleError);
    ctx.strokeRect(bX - scaleError, bY, scaleError, scaleError);
    ctx.strokeRect(cX - scaleError, cY - scaleError, scaleError, scaleError);
    ctx.strokeRect(dX, dY - scaleError, scaleError, scaleError);
    ctx.beginPath();
    ctx.moveTo(...A);
    ctx.lineTo(...B);
    ctx.lineTo(...C);
    ctx.lineTo(...D);
    ctx.lineTo(...A);
    ctx.closePath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  zoom(_: MouseEvent): void {
    if (!this.allowZoom) return;
    // const { x, y } = e;
  }

  unZoom(_: MouseEvent): void {
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.render();
  }

  setLayersData(layerData: LayerDataMap): void {
    this.layers.forEach((layer) => {
      const data = layerData[layer.id];
      if (data) {
        layer.setData(data);
      }
    });
  }

  render(): void {
    this.clearAll();
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.translate(-this.width / 2, -this.height / 2);
    this.orderByIndexAscLayers.forEach((layer) => layer.render(this.ctx));
    this.ctx.restore();
    const id = this.focusingId || this.hoveringId;
    if (id) {
      const layer = this.layerMap[id];
      if (!layer) return;
      this.renderBoundingBox(layer);
    }
  }
}
