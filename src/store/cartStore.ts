import { quantityStep, snapQuantity } from "@/utils/quantity";
import { create } from "zustand";

export type CartItem = {
  id: string;
  lineKey: string;
  packageId?: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  price: number;
  quantity: number;
  isWeighed?: boolean;
  image?: string;
};

type CartProduct = Omit<CartItem, "quantity" | "lineKey"> & { lineKey?: string };

export function cartLineKey(productId: string, packageId?: string) {
  return packageId ? `${productId}:${packageId}` : productId;
}

type CartState = {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: CartProduct, quantity?: number) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
};

function calculateTotalPrice(items: CartItem[]) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(total * 100) / 100;
}

function withTotal(items: CartItem[]) {
  return {
    items,
    totalPrice: calculateTotalPrice(items),
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalPrice: 0,
  addItem: (item, quantity) =>
    set((state) => {
      const isWeighed = item.isWeighed === true;
      const amount = snapQuantity(quantity ?? quantityStep(isWeighed), isWeighed);
      const lineKey = item.lineKey || cartLineKey(item.id, item.packageId);
      const existing = state.items.find((entry) => entry.lineKey === lineKey);

      if (existing) {
        return withTotal(
          state.items.map((entry) =>
            entry.lineKey === lineKey
              ? {
                  ...entry,
                  name: item.name,
                  nameEn: item.nameEn,
                  nameZh: item.nameZh,
                  price: item.price,
                  image: item.image,
                  isWeighed,
                  quantity: snapQuantity(entry.quantity + amount, isWeighed),
                }
              : entry,
          ),
        );
      }

      return withTotal([...state.items, { ...item, lineKey, isWeighed, quantity: amount }]);
    }),
  removeItem: (lineKey) =>
    set((state) =>
      withTotal(state.items.filter((entry) => entry.lineKey !== lineKey)),
    ),
  updateQuantity: (lineKey, quantity) =>
    set((state) => {
      const current = state.items.find((entry) => entry.lineKey === lineKey);
      const isWeighed = current?.isWeighed === true;
      const next = snapQuantity(quantity, isWeighed);

      if (!current || next < quantityStep(isWeighed)) {
        return withTotal(state.items.filter((entry) => entry.lineKey !== lineKey));
      }

      return withTotal(
        state.items.map((entry) =>
          entry.lineKey === lineKey ? { ...entry, quantity: next } : entry,
        ),
      );
    }),
  clearCart: () => set(withTotal([])),
  getTotalPrice: () => get().totalPrice,
}));
