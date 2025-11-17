import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PropertyStore {
  selectedPropertyId: string | null;
  setSelectedProperty: (id: string) => void;
  clearSelectedProperty: () => void;
}

export const usePropertyStore = create<PropertyStore>()(
  persist(
    (set) => ({
      selectedPropertyId: null,
      setSelectedProperty: (id: string) => set({ selectedPropertyId: id }),
      clearSelectedProperty: () => set({ selectedPropertyId: null }),
    }),
    {
      name: 'property-storage',
    }
  )
);

