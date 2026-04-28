export const PRODUCT_TOUR_SEEN_KEY = "ai-rag-lab-tour-seen-v1";
export const PRODUCT_TOUR_AUTO_DISABLED_KEY = "ai-rag-lab-tour-auto-disabled-v1";

type TourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function hasProductTourBeenSeen(storage: TourStorage) {
  return storage.getItem(PRODUCT_TOUR_SEEN_KEY) === "true";
}

export function isProductTourAutoDisabled(storage: TourStorage) {
  return storage.getItem(PRODUCT_TOUR_AUTO_DISABLED_KEY) === "true";
}

export function shouldAutoStartProductTour(storage: TourStorage) {
  return !hasProductTourBeenSeen(storage) && !isProductTourAutoDisabled(storage);
}

export function markProductTourSeen(storage: TourStorage) {
  storage.setItem(PRODUCT_TOUR_SEEN_KEY, "true");
}

export function setProductTourAutoDisabled(storage: TourStorage, disabled: boolean) {
  if (disabled) {
    storage.setItem(PRODUCT_TOUR_AUTO_DISABLED_KEY, "true");
    return;
  }

  storage.removeItem(PRODUCT_TOUR_AUTO_DISABLED_KEY);
}
