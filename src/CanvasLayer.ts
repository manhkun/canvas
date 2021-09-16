import CacheResorce from './Cache';
import CanvasUtils from './CanvasUtils';
import {
  Point, CustomEffect, BoundingBox, LayerOption,
} from './type';

export type VerticalTransitionOrigin = 'top' | 'bottom' | 'center';
export type HorizontalTransitionOrigin = 'left' | 'right' | 'center';
export type ScaleOrigin = `${VerticalTransitionOrigin} ${HorizontalTransitionOrigin}`;

export interface RotationState {
  rotateOrigin: Point;
  rotationAngle: number;
}

export interface LayerCallback {
  (layer?: CanvasLayer): void;
}

export interface ILayerMutableOption {
  renderPos: Point;
  renderWidth: number;
  renderHeight: number;
  rotationAngle: number;
  rotateOrigin: Point;
}

/**
 * A canvas with only one text/image to render
 */
export default abstract class CanvasLayer {
  dynamic = false;

  grayScale = false;

  opacity = 1;

  customEffect?: Partial<CustomEffect>;

  background?: string;

  backgroundImage?: HTMLImageElement;

  backgroundLoaded = true;

  blending?: string;

  zIndex = 0;

  id!: string;

  /**
   * Respresents the rectangle ABCD which has A(x1,y1) and C(x2,y2) surrounds the layer, and 4 edge equations
   */
  boundingBox!: BoundingBox;

  minRenderHeight = 1;

  minRenderWidth = 1;

  rotateRadius = 0;

  backgroundRenderPos?: Point;

  backgroundRotateAngle?: number;

  backgroundRotateOrigin?: Point;

  backgroundRenderWidth = 0;

  backgroundRenderHeight = 0;

  onFragmentLoad: LayerCallback = () => {};

  onUpdate: LayerCallback = () => {};

  cachedResorces: CacheResorce<HTMLImageElement>;

  constructor(
    options: LayerOption,
  ) {
    /**
     * Layer will have the same size as its parent
     */
    this.cachedResorces = new CacheResorce();
    const {
      opacity,
      position,
      blending,
      grayScale,
      background,
      previewType,
      customEffect,
      rotationAngle,
      width,
      height,
      zIndex,
      rotateOrigin,
      id,
    } = options;
    if (id) this.id = id;
    if (typeof opacity === 'number') {
      this.opacity = opacity;
    }
    if (blending) this.blending = blending || '';
    this.grayScale = !!grayScale;
    if (background) {
      if (typeof background === 'string') {
        this.background = background;
      } else {
        const {
          width: bWidth, height: bHeight, src, rotationAngle: bgRA, rotateOrigin: bgRO, renderPos: bgRP,
        } = background;
        this.background = src;
        if (bgRP) this.backgroundRenderPos = bgRP;
        if (bWidth) this.backgroundRenderWidth = bWidth;
        if (bHeight) this.backgroundRenderHeight = bHeight;
        if (bgRA) this.backgroundRotateAngle = bgRA;
        if (bgRO) this.backgroundRotateOrigin = bgRO;
      }
      this.backgroundLoaded = false;
      this.setupBackground();
    }

    if (width) this.renderWidth = width;
    if (height) this.renderHeight = height;

    if (previewType === 'dynamic') {
      this.dynamic = true;
    }

    if (customEffect) this.customEffect = customEffect;
    // Converts deg to rad
    if (rotationAngle) this.rotationAngle = rotationAngle;
    if (rotateOrigin) this.rotateOrigin = rotateOrigin;
    this.backgroundRotateAngle = this.rotationAngle;
    const { x, y } = position;
    const renderX = x;
    const renderY = y;
    this.renderPos = [renderX, renderY];
    if (!this.backgroundRenderPos) this.backgroundRenderPos = [renderX, renderY];
    this.zIndex = zIndex || 0;
    /**
     * boundingBox will not be created at this time because image is absent, it shall be created when image is loaded successfully
     */
  }

  private _renderPos: Point = [0, 0];

  set renderPos(p: Point) {
    this._renderPos = p;
    this.calculateContentBoundingBox();
  }

  /**
   * Render position,may change on resize
   */
  get renderPos(): Point {
    return this._renderPos;
  }

  private _renderWidth = 0;

  set renderWidth(w: number) {
    if (w < this.minRenderWidth) this._renderWidth = this.minRenderWidth;
    this._renderWidth = w;
    this.calculateSizeDependencies();
  }

  /**
   * width of content: image/text not including background
   * make nosense when text layer has curve effect
   */
  get renderWidth(): number {
    return this._renderWidth;
  }

  private _renderHeight = 0;

  set renderHeight(h: number) {
    if (h < this.minRenderHeight) this._renderHeight = this.minRenderHeight;
    this._renderHeight = h;
    this.calculateSizeDependencies();
  }

  /**
   * height of content: image/text not including background
   * make nosense when text layer has curve effect
   */
  get renderHeight(): number {
    return this._renderHeight;
  }

  private _rotateOrigin: Point = [0, 0];

  /**
   * use to rotate when render, not always the center
   */
  get rotateOrigin(): Point {
    return this._rotateOrigin;
  }

  set rotateOrigin(p: Point) {
    const rounded = p;
    this._rotateOrigin = rounded;
    if (this.backgroundRotateOrigin === undefined) this.backgroundRotateOrigin = rounded;
  }

  private _rotationAngle = 0;

  set rotationAngle(a:number) {
    this._rotationAngle = a;
    if (this.backgroundRotateAngle === undefined) this.backgroundRotateAngle = a;
  }

  /**
   * angle in radian
   */
  get rotationAngle():number {
    return this._rotationAngle || 0;
  }

  private _aspectRatio = 1;

  keepAspect = false;

  set aspectRatio(a: number) {
    this._aspectRatio = a;
  }

  /**
   * aspect ratio of content
   */
  get aspectRatio(): number {
    return this._aspectRatio;
  }

  /**
   * Postition of the area has content(image, text) relative to top-left coordinate
   */
  get actualRenderPos(): Point {
    return this.getRenderedPosFromPos(this.renderPos);
  }

  /**
   * current rotate origin, always be the center of boundingBox
   */
  get currentRotateOrigin(): Point {
    const x = this.renderPos[0] + this.renderWidth / 2;
    const y = this.renderPos[1] + this.renderHeight / 2;
    return [x, y];
  }

  get renderCenterPos(): Point {
    const [A, , C] = this.boundingBox.box;
    return CanvasUtils.center(A, C);
  }

  get shouldRenderBackground(): boolean {
    return (
      !!this.background
      && !!this.backgroundImage
      && this.backgroundLoaded
      && this.backgroundRotateAngle !== undefined
      && this.backgroundRotateOrigin !== undefined
    );
  }

  protected calculateAspectRatio(): void {
    if (!this.keepAspect) this.aspectRatio = this.renderWidth / this.renderHeight;
  }

  protected calculateSizeDependencies(): void {
    this.calculateAspectRatio();
    this.calculateRotateRadius();
    this.calculateContentBoundingBox();
  }

  protected calculateRotateRadius(): void {
    this.rotateRadius = Math.sqrt(
      this.renderWidth * this.renderWidth
          + this.renderHeight * this.renderHeight,
    ) / 2;
  }

  /**
   * A
   * ********** B
   * *        *
   * *        *
   * ********** C
   * D
   */
  protected calculateContentBoundingBox(): void {
    this.boundingBox = CanvasUtils.generateBoundingBox(this);
  }

  setId(id: string): void {
    this.id = id;
  }

  protected calculateRotateOrigin(): void {
    const x = this.renderPos[0] + this.renderWidth / 2;
    const y = this.renderPos[1] + this.renderHeight / 2;
    this.rotateOrigin = [x, y];
  }

  protected createImage(src: string, onLoad?: (image?: HTMLImageElement) => any, useCached = true): HTMLImageElement {
    if (useCached) {
      const cached = this.cachedResorces.get(src);
      if (cached) {
        onLoad && onLoad(cached);
        return cached;
      };
    }
    const img = document.createElement('img');
    img.onload = () => {
      this.cachedResorces.set(src, img);
      onLoad && onLoad(img);
    };
    img.src = src;
    return img;
  }

  /**
   * convert pos from top-left of canvas to internal pos(rotated coordinate)
   */
  getPosFromRenderedPos(p: Point): Point {
    const [x, y] = p;
    const { rotateOrigin: [rX, rY], rotationAngle: angle } = this;
    let [x1, y1] = CanvasUtils.getRotatedPoint([x - rX, y - rY], -angle, [0, 0]);
    x1 += rX;
    y1 += rY;
    return [x1, y1];
  }

  getRenderedPosFromPos(p: Point): Point {
    const [x, y] = p;
    const { rotateOrigin: [rX, rY], rotationAngle: angle } = this;
    let [x1, y1] = CanvasUtils.getRotatedPoint([x - rX, y - rY], angle, [0, 0]);
    x1 += rX;
    y1 += rY;
    return [x1, y1];
  }

  // boundingPath = new Path2D();

  isRenderedPointInBox(p: Point): boolean {
    const [x, y] = this.getPosFromRenderedPos(p);
    if (!this.boundingBox) return false;
    const [A, , C] = this.boundingBox.box;
    const [x1, y1] = A;
    const [x2, y2] = C;
    return (y > y1) && (y < y2) && (x > x1) && (x < x2);
  }

  getDistanceToOrigin(p: Point, o: VerticalTransitionOrigin | HorizontalTransitionOrigin, direction: 'horizontal' | 'vertical' = 'horizontal'): number {
    const { renderCenterPos, boundingBox: { box: [A, B, C] } } = this;
    if (o !== 'center') {
      switch (o) {
        case 'right':
          return B[0] - p[0];
        case 'top':
          return p[1] - A[1];
        case 'bottom':
          return C[1] - p[1];
        case 'left':
        default:
          return p[0] - A[0];
      }
    } else {
      switch (direction) {
        case 'vertical':
          return Math.abs(p[1] - renderCenterPos[1]) * 2;
        case 'horizontal':
        default:
          return Math.abs(p[0] - renderCenterPos[0]) * 2;
      }
    }
  }

  /**
   * move center of shape to center
   * Stable
   */
  moveToRenderedPos(center: Point): void {
    const [x1, y1] = this.getPosFromRenderedPos(center);
    const [x2, y2] = this.renderCenterPos;
    const [x3, y3] = this.renderPos;
    const [amountX, amountY] = [x1 - x2, y1 - y2];
    this.renderPos = [x3 + amountX, y3 + amountY];
    this.onUpdate(this);
  }

  /**
   * rotate around current center
   */
  rotate(angle: number): void {
    const [xRP, yRP] = this.getRenderedPosFromPos(this.renderCenterPos);
    this.renderPos = [xRP - this.renderWidth / 2, yRP - this.renderHeight / 2];
    this.rotationAngle = angle;
    this.rotateOrigin = [xRP, yRP];
    this.onUpdate(this);
  }

  /**
   * resize width to newWidth
   * @param { number } newWidth newWidth to set, if newWidth less than minRenderWidth, this function makes no effects
   * @param { HorizontalTransitionOrigin } origin works like CSS origin
   * @param { boolean } keepAspect whether or not adjust height to maintain current aspect ratio
   * @param { boolean } update whether or not call onUpdate after this operation
   */
  horizontalResizeTo(newWidth: number, origin: HorizontalTransitionOrigin, keepAspect = false, update = true): void {
    if (!this.boundingBox) return;
    if (keepAspect) this.keepAspect = true;
    const {
      boundingBox: { box: [_, B] }, minRenderWidth, renderCenterPos, renderPos,
    } = this;
    if (newWidth < minRenderWidth) return;
    const newRenderPos = renderPos;
    switch (origin) {
      case 'right':
        newRenderPos[0] = B[0] - newWidth;
        break;
      case 'center':
        newRenderPos[0] = renderCenterPos[0] - newWidth / 2;
        break;
      default:
        break;
    }
    this.renderWidth = newWidth;
    this.renderPos = newRenderPos;
    if (keepAspect) {
      const newHeight = newWidth / this.aspectRatio;
      this.verticalResizeTo(newHeight, 'center', false, false);
      this.keepAspect = false;
    }
    update && this.onUpdate(this);
  }

  horizontalResizeToParentPos(p: Point, origin: HorizontalTransitionOrigin, keepAspect = false):void {
    const point = this.getPosFromRenderedPos(p);
    const newWidth = this.getDistanceToOrigin(point, origin, 'horizontal');
    this.horizontalResizeTo(newWidth, origin, keepAspect);
  }

  /**
   * resize width to newWidth
   * @param { number } newWidth newWidth to set, if newWidth less than minRenderWidth, this function makes no effects
   * @param { VerticalTransitionOrigin } origin works like CSS origin
   * @param { boolean } keepAspect whether or not adjust height to maintain current aspect ratio
   * @param { boolean } update whether or not call onUpdate after this operation
   */
  verticalResizeTo(newHeight: number, origin: VerticalTransitionOrigin, keepAspect = false, update = true):void {
    if (!this.boundingBox) return;
    if (keepAspect) this.keepAspect = true;
    const {
      boundingBox: { box: [_, __, C] }, minRenderHeight, renderCenterPos, renderPos,
    } = this;
    if (newHeight < minRenderHeight) return;
    const newRenderPos = renderPos;
    switch (origin) {
      case 'bottom':
        newRenderPos[1] = C[1] - newHeight;
        break;
      case 'center':
        newRenderPos[1] = renderCenterPos[1] - newHeight / 2;
        break;
      default:
        break;
    }
    this.renderHeight = newHeight;
    this.renderPos = newRenderPos;
    if (keepAspect) {
      const newWidth = newHeight * this.aspectRatio;
      this.horizontalResizeTo(newWidth, 'center', false, false);
      this.keepAspect = false;
    }
    update && this.onUpdate(this);
  }

  verticalResizeToParentPos(p: Point, origin: VerticalTransitionOrigin, keepAspect = false): void {
    const point = this.getPosFromRenderedPos(p);
    const newHeight = this.getDistanceToOrigin(point, origin, 'vertical');
    this.verticalResizeTo(newHeight, origin, keepAspect);
  }

  lastScaleBase: 'width' | 'height' = 'width';

  scaleToParentPos(p: Point, origin: ScaleOrigin, keepAspect = false): void {
    const [vOrigin, hOrigin] = origin.split(' ') as [VerticalTransitionOrigin, HorizontalTransitionOrigin];
    const point = this.getPosFromRenderedPos(p);
    let newWidth = this.getDistanceToOrigin(point, hOrigin, 'horizontal');
    let newHeight = this.getDistanceToOrigin(point, vOrigin, 'vertical');
    if (newWidth < this.minRenderWidth || newHeight < this.minRenderHeight) return;
    if (keepAspect) {
      const { aspectRatio, renderWidth, renderHeight } = this;
      const wAmount = newWidth - renderWidth;
      const hAmount = newHeight - renderHeight;
      this.keepAspect = true;
      const aspect = aspectRatio;
      let base: 'width' | 'height' = this.lastScaleBase;
      switch (base) {
        case 'width':
          if (Math.abs(wAmount) < 1) return;
          if (hAmount > 0) base = 'height';
          break;
        case 'height':
          if (Math.abs(hAmount) < 1) return;
          if (wAmount > 0) base = 'width';
          break;
        default:
          break;
      }
      if (hAmount > wAmount) base = 'height';
      if (base === 'width') {
        newHeight = newWidth / aspect;
      } else {
        newWidth = newHeight * aspect;
      }
    }
    this.horizontalResizeTo(newWidth, hOrigin, false, false);
    this.verticalResizeTo(newHeight, vOrigin, false, false);
    this.keepAspect = false;
    this.onUpdate(this);
  }

  setIndex(i: number): void {
    this.zIndex = i;
  }

  protected setRotationOrigin(p: Point): void {
    this.rotateOrigin = p;
  }

  abstract setData(data: any): void;

  setupBackground(): void {
    if (this.background) {
      const onBgLoad = () => {
        this.backgroundLoaded = true;
        if (!Math.round(this.backgroundRenderHeight * this.backgroundRenderWidth)) {
          this.backgroundRenderWidth = this.backgroundImage?.width || 0;
          this.backgroundRenderHeight = this.backgroundImage?.height || 0;
        }
        this.onFragmentLoad();
      };
      this.backgroundImage = this.createImage(this.background, onBgLoad);
    }
  }

  protected renderBackground(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;
    if (!this.backgroundRenderPos) return;
    if (!this.shouldRenderBackground) return;
    if (!this.background || !this.backgroundImage) return;
    if (!this.backgroundLoaded) return;
    if (!this.backgroundRotateOrigin) return;
    if (this.backgroundRotateAngle === undefined) return;
    ctx.save();
    const {
      backgroundRenderPos, backgroundRotateOrigin: [x, y], backgroundRotateAngle, backgroundRenderHeight: h, backgroundRenderWidth: w,
    } = this;
    ctx.translate(x, y);
    ctx.rotate((backgroundRotateAngle || 0));
    ctx.translate(-x, -y);

    ctx.drawImage(this.backgroundImage, ...backgroundRenderPos, w, h);
    ctx.restore();
  }

  protected prepareCustomEffect(
    ctx: CanvasRenderingContext2D,
  ): void {
    if (!ctx) return;
    const { customEffect: effects, opacity, blending } = this;
    if (!effects) return;

    const { shadow, stroke } = effects;
    if (opacity) {
      ctx.globalAlpha = opacity;
    }

    if (blending) {
      ctx.globalCompositeOperation = blending;
    }
    if (shadow) {
      const {
        blur, color, offsetX, offsetY,
      } = shadow;
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.shadowOffsetX = offsetX;
      ctx.shadowOffsetY = offsetY;
    }

    if (stroke) {
      const { color } = stroke;
      ctx.strokeStyle = color;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  toGrayscale(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBackground(ctx);
    // this.renderBoundingBox(ctx);
  }

  renderBoundingBox(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;
    const { boundingBox: { box: [A, B, C, D] }, rotateOrigin: [x, y], rotationAngle: angle } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-x, -y);

    ctx.beginPath();
    ctx.moveTo(...A);
    ctx.lineTo(...B);
    ctx.lineTo(...C);
    ctx.lineTo(...D);
    ctx.lineTo(...A);
    ctx.closePath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'blueviolet';
    ctx.stroke();
    ctx.restore();
  }

  setOption(o: Partial<ILayerMutableOption>):void {
    const {
      renderPos, renderWidth, renderHeight, rotateOrigin, rotationAngle,
    } = o;
    if (renderPos) this.renderPos = renderPos;
    if (renderWidth !== undefined) this.renderWidth = renderWidth;
    if (renderHeight !== undefined) this.renderHeight = renderHeight;
    if (rotationAngle !== undefined) this.rotationAngle = rotationAngle;
    if (rotateOrigin) this.rotateOrigin = rotateOrigin;
  }
}
