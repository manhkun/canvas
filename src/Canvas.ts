export default class Canvas {
  el: HTMLCanvasElement;

  ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number, el?: HTMLCanvasElement) {
    if (el) this.el = el;
    else this.el = document.createElement('canvas');
    this.ctx = this.el.getContext('2d')!;
    this.width = width;
    this.height = height;
  }

  get width():number {
    return this.el.width;
  }

  set width(w: number) {
    this.el.width = w;
  }

  get height():number {
    return this.el.height;
  }

  set height(h: number) {
    this.el.height = h;
  }

  setContext(ctx: CanvasRenderingContext2D):void {
    this.ctx = ctx;
  }

  setElement(el: HTMLCanvasElement, widthContext = true): void {
    this.el = el;
    if (widthContext) this.ctx = el.getContext('2d')!;
  }

  toGrayscale(x: number, y: number, width: number, height: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'white';
    this.ctx.globalCompositeOperation = 'saturation';
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  clearAll(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  render():void {

  }
}
