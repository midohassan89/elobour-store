import { quantityStep, snapQuantity } from "@/utils/quantity";
import { create } from "zustand";

export type CartItem = {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  price: number;
  quantity: number;
  isWeighed?: boolean;
  image?: string;
};

type CartProduct = Omit<CartItem, "quantity">;

type CartState = {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: CartProduct, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
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
      const existing = state.items.find((entry) => entry.id === item.id);

      if (existing) {
        return withTotal(
          state.items.map((entry) =>
            entry.id === item.id
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

      return withTotal([...state.items, { ...item, isWeighed, quantity: amount }]);
    }),
  removeItem: (id) =>
    set((state) =>
      withTotal(state.items.filter((entry) => entry.id !== id)),
    ),
  updateQuantity: (id, quantity) =>
    set((state) => {
      const current = state.items.find((entry) => entry.id === id);
      const isWeighed = current?.isWeighed === true;
      const next = snapQuantity(quantity, isWeighed);

      if (!current || next < quantityStep(isWeighed)) {
        return withTotal(state.items.filter((entry) => entry.id !== id));
      }

      return withTotal(
        state.items.map((entry) =>
          entry.id === id ? { ...entry, quantity: next } : entry,
        ),
      );
    }),
  clearCart: () => set(withTotal([])),
  getTotalPrice: () => get().totalPrice,
}));
