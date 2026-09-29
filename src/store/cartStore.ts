import { create } from "zustand";

export type CartItem = {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  price: number;
  quantity: number;
};

type CartProduct = Omit<CartItem, "quantity">;

type CartState = {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: CartProduct) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
};

function calculateTotalPrice(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
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
  addItem: (item) =>
    set((state) => {
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
                  quantity: entry.quantity + 1,
                }
              : entry,
          ),
        );
      }

      return withTotal([...state.items, { ...item, quantity: 1 }]);
    }),
  removeItem: (id) =>
    set((state) =>
      withTotal(state.items.filter((entry) => entry.id !== id)),
    ),
  updateQuantity: (id, quantity) =>
    set((state) => {
      if (quantity < 1) {
        return withTotal(state.items.filter((entry) => entry.id !== id));
      }

      return withTotal(
        state.items.map((entry) =>
          entry.id === id ? { ...entry, quantity } : entry,
        ),
      );
    }),
  clearCart: () => set(withTotal([])),
  getTotalPrice: () => get().totalPrice,
}));
