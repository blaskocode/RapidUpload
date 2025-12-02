import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Detection types from PRD - these are ON by default
// Damage types (P0)
export type DamageType = 'hail_damage' | 'wind_damage' | 'missing_shingles';

// Material types (P0)
export type MaterialType = 'shingles' | 'plywood';

// Loose material types (P1)
export type LooseMaterialType = 'gravel' | 'mulch' | 'sand' | 'dirt' | 'topsoil' | 'stone';

// All toggleable detection types
export type DetectionType = DamageType | MaterialType | LooseMaterialType | 'other';

interface DetectionVisibility {
  // Damage types - ON by default
  hail_damage: boolean;
  wind_damage: boolean;
  missing_shingles: boolean;

  // Material types - ON by default
  shingles: boolean;
  plywood: boolean;

  // Loose material types - ON by default
  gravel: boolean;
  mulch: boolean;
  sand: boolean;
  dirt: boolean;
  topsoil: boolean;
  stone: boolean;

  // Other (non-PRD items like sky, road, etc.) - OFF by default
  other: boolean;
}

interface DetectionSettingsStore {
  visibility: DetectionVisibility;
  setVisibility: (type: DetectionType, visible: boolean) => void;
  resetToDefaults: () => void;
}

const defaultVisibility: DetectionVisibility = {
  // Damage types - ON by default
  hail_damage: true,
  wind_damage: true,
  missing_shingles: true,

  // Material types - ON by default
  shingles: true,
  plywood: true,

  // Loose material types - ON by default
  gravel: true,
  mulch: true,
  sand: true,
  dirt: true,
  topsoil: true,
  stone: true,

  // Other - OFF by default
  other: false,
};

export const useDetectionSettingsStore = create<DetectionSettingsStore>()(
  persist(
    (set) => ({
      visibility: { ...defaultVisibility },

      setVisibility: (type, visible) =>
        set((state) => ({
          visibility: {
            ...state.visibility,
            [type]: visible,
          },
        })),

      resetToDefaults: () =>
        set({ visibility: { ...defaultVisibility } }),
    }),
    {
      name: 'detection-settings',
    }
  )
);

/**
 * Maps a detection label from the AI to a DetectionType for visibility filtering.
 * Returns the detection type key, or 'other' if not recognized.
 */
export function mapLabelToDetectionType(label: string, category: string): DetectionType {
  const lowerLabel = label.toLowerCase();

  // Damage types
  if (category === 'damage') {
    if (lowerLabel.includes('hail')) return 'hail_damage';
    if (lowerLabel.includes('wind') || lowerLabel.includes('storm')) return 'wind_damage';
    if (lowerLabel.includes('missing') && lowerLabel.includes('shingle')) return 'missing_shingles';
    // Any other damage type - treat as 'other' since not in PRD
    return 'other';
  }

  // Material types
  if (category === 'material') {
    if (lowerLabel.includes('shingle')) return 'shingles';
    if (lowerLabel.includes('plywood')) return 'plywood';
    // Any other material type - treat as 'other' since not in PRD
    return 'other';
  }

  // Loose material types
  if (category === 'loose_material') {
    if (lowerLabel.includes('gravel')) return 'gravel';
    if (lowerLabel.includes('mulch')) return 'mulch';
    if (lowerLabel.includes('sand')) return 'sand';
    if (lowerLabel.includes('dirt') || lowerLabel.includes('fill')) return 'dirt';
    if (lowerLabel.includes('topsoil') || lowerLabel.includes('top soil')) return 'topsoil';
    if (lowerLabel.includes('stone') || lowerLabel.includes('rock')) return 'stone';
    // Any other loose material - treat as 'other'
    return 'other';
  }

  // Everything else (sky, road, trees, etc.)
  return 'other';
}

/**
 * Checks if a detection should be visible based on current settings.
 */
export function isDetectionVisible(
  label: string,
  category: string,
  visibility: DetectionVisibility
): boolean {
  const detectionType = mapLabelToDetectionType(label, category);
  return visibility[detectionType];
}
