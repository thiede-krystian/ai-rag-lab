type Matrix2D = [number, number, number, number, number, number];
type MatrixLike = Partial<Pick<DOMMatrix, "a" | "b" | "c" | "d" | "e" | "f">>;
type MatrixInit = string | ArrayLike<number> | MatrixLike;

export function ensurePdfJsDomPolyfills() {
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = SimpleDOMMatrix as unknown as typeof DOMMatrix;
  }
}

class SimpleDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  is2D = true;
  isIdentity = true;

  constructor(init?: MatrixInit) {
    const matrix = parseMatrixInit(init);

    this.setMatrix(matrix);
  }

  get m11() {
    return this.a;
  }

  set m11(value: number) {
    this.a = value;
    this.updateIdentity();
  }

  get m12() {
    return this.b;
  }

  set m12(value: number) {
    this.b = value;
    this.updateIdentity();
  }

  get m21() {
    return this.c;
  }

  set m21(value: number) {
    this.c = value;
    this.updateIdentity();
  }

  get m22() {
    return this.d;
  }

  set m22(value: number) {
    this.d = value;
    this.updateIdentity();
  }

  get m41() {
    return this.e;
  }

  set m41(value: number) {
    this.e = value;
    this.updateIdentity();
  }

  get m42() {
    return this.f;
  }

  set m42(value: number) {
    this.f = value;
    this.updateIdentity();
  }

  multiplySelf(other?: MatrixLike | ArrayLike<number>): this {
    this.setMatrix(multiplyMatrices(this.toMatrix(), parseMatrixInit(other)));

    return this;
  }

  preMultiplySelf(other?: MatrixLike | ArrayLike<number>): this {
    this.setMatrix(multiplyMatrices(parseMatrixInit(other), this.toMatrix()));

    return this;
  }

  translate(x = 0, y = 0): SimpleDOMMatrix {
    return this.clone().translateSelf(x, y);
  }

  translateSelf(x = 0, y = 0): this {
    return this.multiplySelf([1, 0, 0, 1, x, y]);
  }

  scale(scaleX = 1, scaleY = scaleX): SimpleDOMMatrix {
    return this.clone().scaleSelf(scaleX, scaleY);
  }

  scaleSelf(scaleX = 1, scaleY = scaleX): this {
    return this.multiplySelf([scaleX, 0, 0, scaleY, 0, 0]);
  }

  invertSelf(): this {
    const determinant = this.a * this.d - this.b * this.c;

    if (determinant === 0) {
      this.setMatrix([Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN]);
      return this;
    }

    this.setMatrix([
      this.d / determinant,
      -this.b / determinant,
      -this.c / determinant,
      this.a / determinant,
      (this.c * this.f - this.d * this.e) / determinant,
      (this.b * this.e - this.a * this.f) / determinant,
    ]);

    return this;
  }

  toFloat32Array(): Float32Array {
    return new Float32Array(this.toMatrix());
  }

  toFloat64Array(): Float64Array {
    return new Float64Array(this.toMatrix());
  }

  toString(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
  }

  private clone() {
    return new SimpleDOMMatrix(this.toMatrix());
  }

  private toMatrix(): Matrix2D {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }

  private setMatrix(matrix: Matrix2D) {
    [this.a, this.b, this.c, this.d, this.e, this.f] = matrix;
    this.updateIdentity();
  }

  private updateIdentity() {
    this.isIdentity =
      this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
  }
}

function parseMatrixInit(init?: MatrixInit): Matrix2D {
  if (!init) {
    return [1, 0, 0, 1, 0, 0];
  }

  if (typeof init === "string") {
    return parseMatrixString(init);
  }

  if (isArrayLikeMatrix(init)) {
    return init.length >= 6
      ? [init[0] ?? 1, init[1] ?? 0, init[2] ?? 0, init[3] ?? 1, init[4] ?? 0, init[5] ?? 0]
      : [1, 0, 0, 1, 0, 0];
  }

  return [init.a ?? 1, init.b ?? 0, init.c ?? 0, init.d ?? 1, init.e ?? 0, init.f ?? 0];
}

function isArrayLikeMatrix(value: MatrixInit): value is ArrayLike<number> {
  return typeof value === "object" && value !== null && "length" in value;
}

function parseMatrixString(value: string): Matrix2D {
  const match = value.match(/^matrix\((.+)\)$/i);

  if (!match) {
    return [1, 0, 0, 1, 0, 0];
  }

  const values = match[1]
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  return parseMatrixInit(values);
}

function multiplyMatrices(left: Matrix2D, right: Matrix2D): Matrix2D {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}
