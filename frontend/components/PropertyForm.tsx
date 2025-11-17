'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useCreateProperty } from '@/lib/hooks/useProperties';
import toast from 'react-hot-toast';

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

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('Property name is required');
      return false;
    }
    if (name.length > 200) {
      setError('Property name must not exceed 200 characters');
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
      toast.success('Property created successfully!');
      onClose();
    } catch (err: any) {
      const message = err?.message || 'Failed to create property';
      toast.error(message);
      setError(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Create Property</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Property Name
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter property name"
              disabled={createProperty.isPending}
            />
            <div className="mt-1 flex justify-between">
              <span className="text-sm text-red-600">{error}</span>
              <span className="text-sm text-gray-500">{name.length}/200</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              disabled={createProperty.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createProperty.isPending || !name.trim()}
            >
              {createProperty.isPending ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

