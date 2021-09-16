import CanvasLayer from './CanvasLayer';
import {
  BoundingBox, Box, Line, Point,
} from './type';

const {
  abs, sqrt, cos, sin, atan, PI,
} = Math;

function isZero(n: number): boolean {
  return abs(n) < 0.01;
}
export default class CanvasUtils {
  static center(p1: Point, p2: Point): Point {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }

  static createLineFrom2Point(p1: Point, p2: Point): Line | null {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    if (isZero(x1 - x2) && isZero(y1 - y2)) {
      /**
       *  null means no line bc 2 points are the same
       */
      return null;
    }
    const a = y2 - y1;
    const b = x1 - x2;
    const c = x1 * (y1 - y2) + y1 * (x2 - x1);
    const min = [a, b, c].filter((n) => n).sort((x, y) => x - y).reverse()[0];
    return [a / min, b / min, c / min];
  }

  static findProjectionPointOnLine(p: Point, l: Line): Point {
    const [x1, y1] = p;
    const [a, b, c] = l;
    if (x1 * a + y1 * b + c === 0) return [...p];
    if (isZero(b)) return [-c / a, y1];
    if (isZero(a)) return [x1, -c / b];
    const T1 = -y1 * a + x1 * b - (a * c) / b;
    const T2 = b + (a * a) / b;
    const x = T1 / T2;
    const y = (-c - a * x) / b;
    return [x, y];
  }

  static solveL1Equation(
    clause1: Line,
    clause2: Line,
  ): Point | null | undefined {
    const [a1, b1, c1] = clause1;
    const [a2, b2, c2] = clause2;
    const A = b1 * a2 - b2 * a1;
    const B = c1 * a2 - c2 * a1;
    /**
     * A*y + B = 0;
     */
    if (isZero(A)) {
      /**
         * undefined means every x,y
         */
      if (isZero(B)) { return undefined; }
      /**
       * null means no x, y
       */
      return null;
    }
    const y = -B / A;
    const x = (-c1 - b1 * y) / a1;
    return [x, y];
  }

  static findIntersectionOf2Line(
    l1: Line,
    l2: Line,
  ): ReturnType<typeof CanvasUtils['solveL1Equation']> {
    return CanvasUtils.solveL1Equation(l1, l2);
  }

  /**
   * get distance between 2 points
   */
  static distance(p1: Point, p2: Point): number {
    const x = p2[0] - p1[0];
    const y = p2[1] - p1[1];
    return sqrt(x * x + y * y);
  }

  /**
   * get point on cirle given the center point,radius and the angle between the point to the horizontal line from center to the left in radians
   * based on canvas coordinate(Oy from top to bottom)
   */
  static getPointOnCircle(
    center: Point,
    r: number,
    angle: number,
  ): [number, number] {
    const x = center[0] - cos(angle) * r;
    const y = center[1] - sin(angle) * r;
    return [x, y];
  }

  /**
   * get symetric point of (x,y) about center (oX, oY)
   */
  static getSymetricPoint(p: Point, center: Point): [number, number] {
    const sX = center[0] + (center[0] - p[0]);
    const sY = center[1] + (center[1] - p[1]);
    return [sX, sY];
  }

  /**
   * genrate bounding box ABCD from Layer
   */
  static generateBoundingBox(layer: CanvasLayer): BoundingBox {
    const {
      renderPos, renderWidth: w, renderHeight: h,
    } = layer;
    const [x, y] = renderPos;
    const center: Point = [
      x + w / 2,
      y + h / 2,
    ];
    const A = renderPos;
    const B:Point = [x + w, y];
    const C = CanvasUtils.getSymetricPoint(A, center);
    const D = CanvasUtils.getSymetricPoint(B, center);
    const box:Box = [A, B, C, D];
    const topLine = CanvasUtils.createLineFrom2Point(A, B) as Line;
    const bottomLine = CanvasUtils.createLineFrom2Point(C, D) as Line;
    const leftLine = CanvasUtils.createLineFrom2Point(A, D) as Line;
    const rightLine = CanvasUtils.createLineFrom2Point(B, C) as Line;
    return {
      box,
      rightLine,
      leftLine,
      bottomLine,
      topLine,
    };
  }

  static getMousePos(e: MouseEvent, el: HTMLElement, scale = [1, 1]): Point {
    const boundingBox = el.getBoundingClientRect();
    const { top, left } = boundingBox;
    const { clientX, clientY } = e;
    const x = clientX - left;
    const y = clientY - top;
    return [x * scale[0], y * scale[1]];
  }

  static getRotatedPoint(ogPoint: Point, angle = 0, center: Point = [0, 0]): Point {
    const [x1, y1] = ogPoint;
    const [x2, y2] = center;
    const x = (x1 - x2) * cos(angle) - (y1 - y2) * sin(angle) + x2;
    const y = (x1 - x2) * sin(angle) + (y1 - y2) * cos(angle) + y2;
    return [x, y];
  }

  static getAngleWithOx(p: Point, translate: [number, number] = [0, 0]): number {
    const [x, y] = [p[0] - translate[0], p[1] - translate[1]];
    if (y === 0) return x > 0 ? 0 : Math.PI;
    if (x === 0) return y > 0 ? PI / 2 : 3 * (PI / 2);
    const alpha = atan(abs(y) / abs(x));
    if (x < 0 && y > 0) return PI - alpha;
    if (x < 0 && y < 0) return PI + alpha;
    if (x > 0 && y > 0) return alpha;
    return 2 * PI - alpha;
  }

  /**
   * Returns angle between 2 vector created by AB, AC
   */
  static getAngle(A: Point, B: Point, C: Point): number {
    const [x1, y1] = A;
    const [x2, y2] = B;
    const [x3, y3] = C;
    const AB = [x2 - x1, y2 - y1] as Point;
    const AC = [x3 - x1, y3 - y1] as Point;
    const beta = CanvasUtils.getAngleWithOx(AC);
    const alpha = CanvasUtils.getAngleWithOx(AB);
    return beta - alpha;
  }

  /**
   * p in ABCD, AB = w, AC = h
   */
  static isPointInRect(p: Point, A: Point, w: number, h: number): boolean {
    const [x, y] = p;
    const [x1, y1] = A;
    const [x2, y2] = [x1 + w, y1 + h];
    return (x > x1 && x < x2 && y > y1 && y < y2);
  }
}
