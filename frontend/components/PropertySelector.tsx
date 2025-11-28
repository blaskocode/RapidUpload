'use client';

import { useProperties } from '@/lib/hooks/useProperties';
import { usePropertyStore } from '@/stores/propertyStore';

export default function PropertySelector() {
  const { data: properties, isLoading } = useProperties();
  const { selectedPropertyId, setSelectedProperty, clearSelectedProperty } = usePropertyStore();

  if (isLoading) {
    return (
      <div className="w-full max-w-xs">
        <div className="h-11 bg-[var(--color-bg-tertiary)] rounded-[var(--radius-lg)] animate-pulse"></div>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="w-full max-w-xs text-sm text-[var(--color-text-muted)] flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        No properties available
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-xs">
      <select
        value={selectedPropertyId || ''}
        onChange={(e) => {
          if (e.target.value) {
            setSelectedProperty(e.target.value);
          } else {
            clearSelectedProperty();
          }
        }}
        className="w-full px-4 py-2.5 pr-10 border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-medium appearance-none cursor-pointer transition-all duration-200 hover:border-[var(--color-primary)]/50"
      >
        <option value="" className="text-[var(--color-text-muted)]">Select a property...</option>
        {properties.map((property) => (
          <option key={property.propertyId} value={property.propertyId}>
            {property.name} ({property.photoCount} photos)
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

