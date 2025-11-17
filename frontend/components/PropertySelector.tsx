'use client';

import { useProperties } from '@/lib/hooks/useProperties';
import { usePropertyStore } from '@/stores/propertyStore';

export default function PropertySelector() {
  const { data: properties, isLoading } = useProperties();
  const { selectedPropertyId, setSelectedProperty, clearSelectedProperty } = usePropertyStore();

  if (isLoading) {
    return (
      <div className="w-full max-w-xs">
        <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="w-full max-w-xs text-sm text-gray-500">
        No properties available
      </div>
    );
  }

  return (
    <select
      value={selectedPropertyId || ''}
      onChange={(e) => {
        if (e.target.value) {
          setSelectedProperty(e.target.value);
        } else {
          clearSelectedProperty();
        }
      }}
      className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
    >
      <option value="">Select a property...</option>
      {properties.map((property) => (
        <option key={property.propertyId} value={property.propertyId}>
          {property.name} ({property.photoCount} photos)
        </option>
      ))}
    </select>
  );
}

