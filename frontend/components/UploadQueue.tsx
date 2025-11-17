'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import UploadProgressItem from './UploadProgressItem';
import type { QueuedPhoto, UploadStatus } from '@/types/upload';
import { useUploadStore } from '@/stores/uploadStore';

// Dynamically import List to avoid SSR issues with react-window
const List = dynamic(
  () => import('react-window').then((mod) => mod.List),
  { ssr: false }
);

interface UploadQueueProps {
  queue: QueuedPhoto[];
  onRetry?: (photoId: string) => void;
  onCancel?: (photoId: string) => void;
  filter?: 'all' | 'in-progress' | 'failed' | 'completed';
}

const ITEM_HEIGHT = 100;
const EXPANDED_ITEM_HEIGHT = 140;

export default function UploadQueue({
  queue,
  onRetry,
  onCancel,
  filter = 'all',
}: UploadQueueProps) {
  const listRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const uploadStatus = useUploadStore((state) => state.uploadStatus);

  const filteredQueue = useMemo(() => {
    if (filter === 'all') return queue;
    return queue.filter((photo) => {
      const status = uploadStatus[photo.photoId]?.status;
      switch (filter) {
        case 'in-progress':
          return status === 'uploading' || status === 'queued';
        case 'failed':
          return status === 'failed';
        case 'completed':
          return status === 'complete';
        default:
          return true;
      }
    });
  }, [queue, filter, uploadStatus]);

  const Row = useCallback(
    ({ index, style, ariaAttributes }: { 
      index: number; 
      style: React.CSSProperties;
      ariaAttributes: { 
        'aria-posinset': number; 
        'aria-setsize': number; 
        role: 'listitem' 
      };
    }) => {
      const photo = filteredQueue[index];
      if (!photo) {
        return <div style={style} className="px-2" {...ariaAttributes} />;
      }

      const status = uploadStatus[photo.photoId];
      const progress = status?.progress || 0;
      const uploadStatusValue = status?.status || 'queued';
      const error = status?.error;

      return (
        <div style={style} className="px-2" {...ariaAttributes}>
          <UploadProgressItem
            photoId={photo.photoId}
            filename={photo.filename}
            size={photo.fileSize}
            progress={progress}
            status={uploadStatusValue as UploadStatus}
            error={error}
            onRetry={onRetry}
            onCancel={onCancel}
          />
        </div>
      );
    },
    [filteredQueue, uploadStatus, onRetry, onCancel]
  );

  const scrollToFailed = useCallback(() => {
    const firstFailedIndex = filteredQueue.findIndex(
      (photo) => uploadStatus[photo.photoId]?.status === 'failed'
    );
    if (firstFailedIndex !== -1 && listRef.current) {
      listRef.current.scrollToItem(firstFailedIndex, 'start');
    }
  }, [filteredQueue, uploadStatus]);

  if (filteredQueue.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No items in queue</p>
      </div>
    );
  }

  // Don't render the virtualized list until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">Loading queue...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {filteredQueue.length} item{filteredQueue.length !== 1 ? 's' : ''}
          </span>
          {filter === 'all' && filteredQueue.some((p) => uploadStatus[p.photoId]?.status === 'failed') && (
            <button
              onClick={scrollToFailed}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Jump to failed
            </button>
          )}
        </div>
      </div>
      <div className="h-[600px]">
        <List
          defaultHeight={600}
          rowCount={filteredQueue.length}
          rowHeight={ITEM_HEIGHT}
          style={{ height: '600px', width: '100%' }}
          overscanCount={5}
          rowComponent={Row}
          rowProps={{}}
        />
      </div>
    </div>
  );
}

