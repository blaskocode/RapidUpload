'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProperties } from '@/lib/hooks/useProperties';

export default function Navigation() {
  const pathname = usePathname();
  const { data: properties } = useProperties();
  const totalPhotos = properties?.reduce((sum, p) => sum + (p.photoCount || 0), 0) || 0;

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600">📸</div>
            <span className="text-xl font-bold text-gray-900">RapidUpload</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isActive('/')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Properties
              {properties && properties.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">({properties.length})</span>
              )}
            </Link>

            <Link
              href="/upload"
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isActive('/upload')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Upload Photos
              {totalPhotos > 0 && (
                <span className="ml-2 text-sm text-gray-500">({totalPhotos} total)</span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

