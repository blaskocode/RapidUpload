'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useCreateProperty } from '@/lib/hooks/useProperties';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertyForm({ isOpen, onClose }: PropertyFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const createProperty = useCreateProperty();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpenForm = () => {
      // This is handled by parent, but we could emit back if needed
    };
    window.addEventListener('openPropertyForm', handleOpenForm);
    return () => window.removeEventListener('openPropertyForm', handleOpenForm);
  }, []);

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('Project name is required');
      return false;
    }
    if (name.length > 200) {
      setError('Project name must not exceed 200 characters');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createProperty.mutateAsync({ name: name.trim() });
      toast.success('Project created successfully!');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      toast.error(message);
      setError(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-bg-primary)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Create Project</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Add a new job site to document</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-[var(--radius-md)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              maxLength={200}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-[var(--radius-md)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
                text-[var(--color-text-primary)] bg-[var(--color-bg-primary)]
                placeholder:text-[var(--color-text-muted)]
                disabled:opacity-50 disabled:bg-[var(--color-bg-secondary)]
                transition-all duration-200"
              placeholder="e.g., 123 Main St - Roof Inspection"
              disabled={createProperty.isPending}
              autoFocus
            />
            <div className="mt-2 flex justify-between items-center">
              {error ? (
                <span className="text-sm text-[var(--color-error)]">{error}</span>
              ) : (
                <span className="text-sm text-[var(--color-text-muted)]">Enter a descriptive name for this job site</span>
              )}
              <span className={`text-sm ${name.length > 180 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'}`}>
                {name.length}/200
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-b-[var(--radius-xl)]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={createProperty.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createProperty.isPending || !name.trim()}
              isLoading={createProperty.isPending}
            >
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
