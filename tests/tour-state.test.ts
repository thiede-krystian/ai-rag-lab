import { describe, expect, it } from "vitest";
import {
  PRODUCT_TOUR_AUTO_DISABLED_KEY,
  PRODUCT_TOUR_SEEN_KEY,
  hasProductTourBeenSeen,
  isProductTourAutoDisabled,
  markProductTourSeen,
  setProductTourAutoDisabled,
  shouldAutoStartProductTour,
} from "@/lib/tour-state";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("product tour state", () => {
  it("auto-starts before the guide is seen or disabled", () => {
    const storage = new MemoryStorage();

    expect(shouldAutoStartProductTour(storage)).toBe(true);
  });

  it("does not auto-start after the guide was seen", () => {
    const storage = new MemoryStorage();

    markProductTourSeen(storage);

    expect(storage.getItem(PRODUCT_TOUR_SEEN_KEY)).toBe("true");
    expect(hasProductTourBeenSeen(storage)).toBe(true);
    expect(shouldAutoStartProductTour(storage)).toBe(false);
  });

  it("does not auto-start when auto guide is disabled", () => {
    const storage = new MemoryStorage();

    setProductTourAutoDisabled(storage, true);

    expect(storage.getItem(PRODUCT_TOUR_AUTO_DISABLED_KEY)).toBe("true");
    expect(isProductTourAutoDisabled(storage)).toBe(true);
    expect(shouldAutoStartProductTour(storage)).toBe(false);
  });

  it("can re-enable auto guide without changing seen state", () => {
    const storage = new MemoryStorage();

    setProductTourAutoDisabled(storage, true);
    setProductTourAutoDisabled(storage, false);

    expect(storage.getItem(PRODUCT_TOUR_AUTO_DISABLED_KEY)).toBeNull();
    expect(isProductTourAutoDisabled(storage)).toBe(false);
    expect(shouldAutoStartProductTour(storage)).toBe(true);
  });
});
