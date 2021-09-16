import CanvasLayer from './CanvasLayer';
import {
  Alignment, TextLayerData, TextLayerOption,
} from './type';

export interface ITextLayer extends CanvasLayer {
  readonly type: 'text';
  text: string;
  color: string;
  align: Alignment;
  font: string;
  size: number;
  lineHeight: number;
  actualTextHeight: number;
}

export default class TextLayer extends CanvasLayer implements ITextLayer {
  readonly type: ITextLayer['type'] = 'text';

  text = '';

  color = 'black';

  align: Alignment = {
    horizontal: 'left',
    vertical: 'center',
  };

  font!: string;

  size!: number;

  lineHeight = 1;

  actualTextHeight = 0;

  shouldPrepareBeforeRender = false;

  curveRadius?: number;

  fontAutoFitWidth = false;

  /**
   * adjust size to fit with, only when set data
   */
  shouldAdjustFontSize = false;

  c = true;

  constructor(option: TextLayerOption) {
    super(option);
    const { customEffect } = option;
    this.fontAutoFitWidth = !!option.fontAutoFitWidth;
    this.shouldAdjustFontSize = true;
    if (!customEffect) return;
    const { curve } = customEffect;
    if (!curve) return;
    const { radius } = curve;
    if (radius !== undefined) this.curveRadius = radius;
  }

  prepareBeforeRender(ctx: CanvasRenderingContext2D):void {
    if (!ctx) return;
    const {
      size, shouldPrepareBeforeRender, font, text, lineHeight,
      renderWidth, renderHeight,
    } = this;
    if (!shouldPrepareBeforeRender) return;
    const lines = text.split('\n').filter((s) => !!s);
    this.actualTextHeight = lines.length * size * lineHeight;
    ctx.save();
    ctx.font = `${size}px ${font || ''}`;
    let shoudAdjustWH = false;
    if (!(renderWidth * renderHeight)) {
      shoudAdjustWH = true;
      if (this.customEffect?.width) {
        this.renderWidth = this.customEffect.width;
        this.renderHeight = this.actualTextHeight;
      } else {
        let width = 0;
        lines.forEach((line) => {
          const { width: w } = ctx.measureText(line);
          if (w > width) width = w;
        });
        this.renderWidth = width;
        this.renderHeight = this.actualTextHeight;
      }
    }
    if (this.shouldAdjustFontSize) {
      ctx.save();
      let betterSize = size;
      let width = Math.max(...lines.map((line) => ctx.measureText(line).width));
      while (width > this.renderWidth) {
        betterSize -= 0.5;
        ctx.font = `${betterSize}px ${font || ''}`;
        width = Math.max(...lines.map((line) => ctx.measureText(line).width));
      }
      ctx.restore();
      this.size = betterSize;
      this.actualTextHeight = lines.length * this.size * lineHeight;
      if (shoudAdjustWH) {
        this.renderHeight = this.actualTextHeight;
      }
    }
    ctx.restore();
    this.c && this.calculateRotateOrigin();
    this.c = false;
    this.shouldPrepareBeforeRender = false;
  }

  setData(data: TextLayerData):void {
    if (!data) return;
    const {
      text, size, align, font, color,
    } = data;
    if (typeof text === 'string') this.text = text;
    if (size) this.size = size;
    if (align) {
      const { vertical, horizontal } = align;
      if (vertical) this.align.vertical = vertical;
      if (horizontal) this.align.horizontal = horizontal;
    }
    if (font) this.font = font;
    if (color) this.color = color;
    this.shouldPrepareBeforeRender = true;
    this.onUpdate(this);
  }

  drawText(ctx: CanvasRenderingContext2D):void {
    const {
      color,
      text,
      renderPos: [x, y],
      renderWidth,
      renderHeight,
      size,
      font,
      align,
      lineHeight,
      actualTextHeight,
      curveRadius,
    } = this;
    const { horizontal, vertical } = align;

    ctx.textAlign = horizontal;
    ctx.textBaseline = 'top';
    if (font || size) ctx.font = `${size}px ${font || ''}`;
    ctx.fillStyle = color;

    if (curveRadius) {
      const actualRadius = curveRadius;
      const [xO, yO] = [x, y + actualRadius];
      ctx.save();
      ctx.translate(xO, yO);
      ctx.textAlign = 'left';
      ctx.fillRect(-5, -5, 10, 10);
      let totalAngle = 0;
      text.split('').forEach((letter) => {
        const { width: lW } = ctx.measureText(letter);
        const angleToRotate = Math.asin(lW / actualRadius);
        totalAngle += angleToRotate;
      });
      switch (horizontal) {
        case 'center':
          ctx.rotate(-totalAngle / 2);
          break;
        default:
          break;
      }
      text.split('').forEach((letter) => {
        const { width: lW } = ctx.measureText(letter);
        const angleToRotate = Math.asin(lW / actualRadius);
        ctx.save();
        ctx.translate(0, -actualRadius);
        ctx.fillText(letter, 0, 0);
        ctx.beginPath();
        ctx.moveTo(0, actualRadius);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillRect(-3, -3, 7, 7);
        ctx.restore();
        ctx.rotate(angleToRotate);
      });

      ctx.restore();
      return;
    }
    const lines = text.split('\n');
    let xAdjustment = 0;
    let yAdjustment = 0;
    switch (horizontal) {
      case 'right':
        xAdjustment = this.renderWidth;
        break;
      case 'center':
        xAdjustment = this.renderWidth / 2;
        break;
      default:
        break;
    }

    switch (vertical) {
      case 'center':
        yAdjustment = (renderHeight - actualTextHeight) / 2;
        break;
      case 'bottom':
        yAdjustment = (renderHeight - actualTextHeight);
        break;
      default:
        break;
    }
    lines.forEach((line, index) => {
      ctx.fillText(line, x + xAdjustment, y + index * size * lineHeight + yAdjustment, renderWidth);
    });
    // ctx.fillText(text, x, y, renderWidth);
  }

  render(ctx: CanvasRenderingContext2D):void {
    if (!ctx) return;
    this.prepareBeforeRender(ctx);
    super.render(ctx);
    ctx.save();
    const {
      grayScale,
      customEffect,
      rotationAngle,
      rotateOrigin: [rotateOriginX, rotateOriginY],
    } = this;
      // Prepare some effect like opacity
    /**
     * Vertical align is not possible now
     */

    ctx.translate(rotateOriginX, rotateOriginY);
    ctx.rotate(rotationAngle);
    ctx.translate(-rotateOriginX, -rotateOriginY);

    if (customEffect) {
      this.prepareCustomEffect(ctx);
    }

    this.drawText(ctx);

    if (grayScale) {
      /**
         * Grayscale text seems not possible now
         */
    }
    ctx.restore();
  }
}
