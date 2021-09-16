export default class CacheResorce<T> {
  protected cached: Record<string, T>;

  constructor() {
    this.cached = {};
  }

  get(key:string): T | undefined {
    return this.cached[key];
  }

  getAll(): Record<string, T> {
    return this.cached;
  }

  set(key: string, value: T): void {
    this.cached[key] = value;
  }
}
