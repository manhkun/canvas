import CanvasLayer from './CanvasLayer';
import { ImageLayerData } from './type';

export interface IImageLayer extends CanvasLayer {
  readonly type: 'image';
  image: HTMLImageElement;
  imageLoaded: boolean;
}

export default class ImageLayer extends CanvasLayer implements IImageLayer {
  type: IImageLayer['type'] = 'image';

  image!: HTMLImageElement;

  imageLoaded = false;

  lastImage?: HTMLImageElement;

  c = true;

  private setImage(src: string) {
    this.imageLoaded = false;
    const image = this.createImage(src, (img) => {
      this.imageLoaded = true;
      this.lastImage = img;
      this.c && this.calculateRotateOrigin();
      this.c = false;
      this.onUpdate(this);
    });
    this.image = image;
  }

  setData(data: Partial<ImageLayerData>): void {
    console.log('xxximagechanged', data);
    if (!data) return;
    if (!data.src) return;
    const {
      src, width, height, renderPos, rotateOrigin, rotationAngle,
    } = data;
    this.setOption({
      renderWidth: width, renderHeight: height, renderPos, rotateOrigin, rotationAngle,
    });
    this.setImage(src);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;
    let imageToRender = this.image;
    if (!this.imageLoaded) {
      if (this.lastImage) {
        imageToRender = this.lastImage;
      } else {
        return;
      }
    }
    super.render(ctx);
    ctx.save();
    const {
      grayScale,
      customEffect,
      renderPos: [x, y],
      renderHeight,
      renderWidth,
      toGrayscale,
    } = this;

    const {
      rotateOrigin: [rotateOriginX, rotateOriginY],
      rotationAngle,
    } = this;

    ctx.translate(rotateOriginX, rotateOriginY);
    ctx.rotate(rotationAngle);
    ctx.translate(-rotateOriginX, -rotateOriginY);

    if (customEffect) {
      this.prepareCustomEffect(ctx);
    }

    if (grayScale) {
      ctx.drawImage(imageToRender, x, y, renderWidth, renderHeight);
      toGrayscale(ctx, x, y, renderWidth, renderHeight);
    } else {
      ctx.drawImage(imageToRender, x, y, renderWidth, renderHeight);
    }
    ctx.restore();
  }
}
