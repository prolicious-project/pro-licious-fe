import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  id: number; // menuItemId
  name: string;
  price: string;
  quantity: number;
  vendorId: number;
  imageUrl?: string;
  cartItemId?: number;
}

interface CartState {
  items: CartItem[];
  vendorId: number | null;
}

const initialState: CartState = {
  items: [],
  vendorId: null,
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const { vendorId, id, name, price, quantity, imageUrl } = action.payload;
      
      // Prevent adding items from multiple vendors
      if (state.vendorId !== null && state.vendorId !== vendorId && state.items.length > 0) {
        throw new Error("Cannot add items from multiple vendors to the same cart.");
      }
      
      state.vendorId = vendorId;
      
      const existingItem = state.items.find(item => item.id === id);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ id, name, price, quantity, vendorId, imageUrl });
      }
    },
    removeItem: (state, action: PayloadAction<number>) => { // passing menuItemId
      state.items = state.items.filter(item => item.id !== action.payload);
      if (state.items.length === 0) {
        state.vendorId = null;
      }
    },
    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.id !== action.payload.id);
        }
      }
      if (state.items.length === 0) {
        state.vendorId = null;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.vendorId = null;
    },
    setCart: (state, action: PayloadAction<{ items: CartItem[]; vendorId: number | null }>) => {
      state.items = action.payload.items;
      state.vendorId = action.payload.vendorId;
    }
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;

