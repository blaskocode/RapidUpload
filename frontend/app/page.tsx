'use client';

import { useState, useEffect } from 'react';
import PropertyList from '@/components/PropertyList';
import PropertyForm from '@/components/PropertyForm';
import Button from '@/components/ui/Button';

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Listen for custom event to open modal from empty state
  useEffect(() => {
    const handleOpenForm = () => setIsFormOpen(true);
    window.addEventListener('openPropertyForm', handleOpenForm);
    return () => window.removeEventListener('openPropertyForm', handleOpenForm);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-[var(--container-max)]">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Projects</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">Manage your job site photo documentation</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsFormOpen(true)}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Project
          </Button>
        </div>

        <PropertyList />
        <PropertyForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
      </div>
    </div>
  );
}
