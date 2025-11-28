'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import UploadProgressItem from './UploadProgressItem';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
        return <div style={style} className="px-3" {...ariaAttributes} />;
      }

      const status = uploadStatus[photo.photoId];
      const progress = status?.progress || 0;
      const uploadStatusValue = status?.status || 'queued';
      const error = status?.error;

      return (
        <div style={style} className="px-3" {...ariaAttributes}>
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
      <Card variant="default" padding="lg">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[var(--color-text-muted)]">No items in queue</p>
        </div>
      </Card>
    );
  }

  // Don't render the virtualized list until client-side hydration is complete
  if (!isClient) {
    return (
      <Card variant="default" padding="lg">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)]">Loading queue...</p>
        </div>
      </Card>
    );
  }

  const hasFailedItems = filteredQueue.some((p) => uploadStatus[p.photoId]?.status === 'failed');

  return (
    <Card variant="default" padding="none">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {filteredQueue.length} item{filteredQueue.length !== 1 ? 's' : ''}
          </span>
          {filter === 'all' && hasFailedItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToFailed}
              className="text-[var(--color-error)] hover:bg-[var(--color-error-light)]"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Jump to failed
            </Button>
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
    </Card>
  );
}

