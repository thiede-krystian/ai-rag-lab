import { afterEach, describe, expect, it } from "vitest";
import { ensurePdfJsDomPolyfills } from "@/lib/pdf-dom-polyfills";

const originalDOMMatrix = globalThis.DOMMatrix;

describe("PDF.js DOM polyfills", () => {
  afterEach(() => {
    if (originalDOMMatrix) {
      globalThis.DOMMatrix = originalDOMMatrix;
    } else {
      Reflect.deleteProperty(globalThis, "DOMMatrix");
    }
  });

  it("installs DOMMatrix when Node runtime does not provide it", () => {
    Reflect.deleteProperty(globalThis, "DOMMatrix");

    ensurePdfJsDomPolyfills();

    expect(typeof globalThis.DOMMatrix).toBe("function");
    expect(new DOMMatrix().toString()).toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  it("supports 2D matrix operations used by PDF.js", () => {
    Reflect.deleteProperty(globalThis, "DOMMatrix");
    ensurePdfJsDomPolyfills();

    const matrix = new DOMMatrix([1, 2, 3, 4, 5, 6]).translate(10, 20).scale(2, 3);

    expect([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]).toEqual([
      2, 4, 9, 12, 75, 106,
    ]);

    matrix.invertSelf();
    expect(matrix.a).toBeCloseTo(-1);
    expect(matrix.b).toBeCloseTo(1 / 3);
    expect(matrix.c).toBeCloseTo(0.75);
    expect(matrix.d).toBeCloseTo(-1 / 6);
  });
});
