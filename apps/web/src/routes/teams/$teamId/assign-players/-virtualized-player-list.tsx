import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, useRef } from 'react';

const VIRTUAL_ROW_ESTIMATE = 96;
const VIRTUALIZATION_THRESHOLD = 20;

export function VirtualizedPlayerList<TItem>({
  items,
  getItemKey,
  renderItem,
}: {
  items: TItem[];
  getItemKey: (item: TItem) => number | string;
  renderItem: (item: TItem) => ReactNode;
}) {
  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => VIRTUAL_ROW_ESTIMATE,
    overscan: 6,
  });

  if (items.length <= VIRTUALIZATION_THRESHOLD) {
    return (
      <div className='space-y-2'>
        {items.map((item) => (
          <div className='py-1' key={String(getItemKey(item))}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  if (virtualItems.length === 0) {
    return (
      <div className='h-96 overflow-y-auto'>
        <div className='space-y-2'>
          {items.map((item) => (
            <div className='py-1' key={String(getItemKey(item))}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const firstItemStart = virtualItems[0]?.start ?? 0;
  const lastItemEnd = virtualItems.at(-1)?.end ?? 0;
  const paddingBottom = rowVirtualizer.getTotalSize() - lastItemEnd;

  return (
    <div className='h-96 overflow-y-auto' ref={scrollElementRef}>
      <div
        style={{
          paddingBottom: `${paddingBottom}px`,
          paddingTop: `${firstItemStart}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];

          if (!item) {
            return null;
          }

          return (
            <div className='py-1' key={String(getItemKey(item))}>
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
