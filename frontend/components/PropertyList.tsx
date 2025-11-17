'use client';

import { useProperties } from '@/lib/hooks/useProperties';
import { useRouter } from 'next/navigation';
import type { Property } from '@/types/api';

function PropertyCard({ property }: { property: Property }) {
  const router = useRouter();
  const date = new Date(property.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/upload?propertyId=${property.propertyId}`);
  };

  return (
    <div
      onClick={() => router.push(`/properties/${property.propertyId}`)}
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold text-gray-900 truncate flex-1">{property.name}</h3>
        <button
          onClick={handleUploadClick}
          className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0"
          title="Upload photos"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>{date}</span>
        <span className="font-medium">{property.photoCount} photos</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse border border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}

export default function PropertyList() {
  const { data: properties, isLoading, error } = useProperties();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <LoadingSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Error loading properties</p>
        <p className="text-sm mt-1">
          {(error as any)?.message || 'Failed to fetch properties. Please try again.'}
        </p>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600 text-lg mb-2">No properties yet</p>
        <p className="text-gray-500 text-sm">Create your first property to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard key={property.propertyId} property={property} />
      ))}
    </div>
  );
}

