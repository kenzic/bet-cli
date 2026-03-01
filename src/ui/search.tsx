import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectEntry } from './select.js';

const DEFAULT_MAX_ROWS = 18;

export type SearchSelectProps<T> = {
  title?: string;
  allItems: SelectEntry<T>[];
  filter: (items: SelectEntry<T>[], query: string) => SelectEntry<T>[];
  onSelect: (item: SelectEntry<T>) => void;
  onCancel?: () => void;
  maxRows?: number;
  initialQuery?: string;
  showCount?: boolean;
};

export function SearchSelect<T>({
  title,
  allItems,
  filter,
  onSelect,
  onCancel,
  maxRows = DEFAULT_MAX_ROWS,
  initialQuery = '',
  showCount = true,
}: SearchSelectProps<T>): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [query, setQuery] = useState(initialQuery);

  const items = useMemo(() => filter(allItems, query), [allItems, filter, query]);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onCancel?.();
      return;
    }

    if (key.return) {
      const entry = items[cursor];
      if (entry) onSelect(entry);
      return;
    }

    if (key.upArrow || input === 'k') {
      setCursor((prev) => (prev - 1 + items.length) % Math.max(items.length, 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setCursor((prev) => (prev + 1) % Math.max(items.length, 1));
      return;
    }

    if (input === '\b' || input === '\x7f') {
      setQuery((prev) => prev.slice(0, -1));
      setCursor(0);
      return;
    }

    if (input) {
      setQuery((prev) => prev + input);
      setCursor(0);
    }
  });

  if (items.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
        {title ? (
          <Box marginBottom={1}>
            <Text bold color="cyan">
              {title}
            </Text>
          </Box>
        ) : null}
        <Box marginBottom={1} flexDirection="row">
          <Text bold color="yellow">Search: </Text>
          <Text color="cyan">{query || '…'}</Text>
        </Box>
        <Text color="yellow">No results.</Text>
        <Box marginTop={1}>
          <Text color="gray">Press Esc to exit.</Text>
        </Box>
      </Box>
    );
  }

  const selectedRowIndex = Math.min(cursor, items.length - 1);
  const totalRows = items.length;
  const effectiveMaxRows = Math.max(3, maxRows);
  const windowStart = Math.min(
    Math.max(0, selectedRowIndex - Math.floor(effectiveMaxRows / 2)),
    Math.max(0, totalRows - effectiveMaxRows)
  );
  const windowEnd = Math.min(totalRows, windowStart + effectiveMaxRows);
  const windowed = items.slice(windowStart, windowEnd);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      {title ? (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>
      ) : null}
      <Box marginBottom={1} flexDirection="row">
        <Text bold color="yellow">Search: </Text>
        <Text color="green">{query || '…'}</Text>
        {showCount ? (
          <Text color="cyan"> · {items.length} result{items.length !== 1 ? 's' : ''}</Text>
        ) : null}
      </Box>
      <Box flexDirection="column">
        {windowed.map((row, idx) => {
          const absoluteIndex = windowStart + idx;
          const selected = absoluteIndex === selectedRowIndex;
          return (
            <Box key={`item-${absoluteIndex}`} flexDirection="row">
              <Text color={selected ? 'green' : undefined} bold={selected}>
                {selected ? '› ' : '  '}
                {row.label}
              </Text>
              {row.hint ? <Text color="gray"> {row.hint}</Text> : null}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Text color="yellow">Type to filter</Text>
        <Text color="gray"> · </Text>
        <Text color="yellow">↑/↓ or j/k</Text>
        <Text color="gray"> · </Text>
        <Text color="green">Enter</Text>
        <Text color="gray"> to select · </Text>
        <Text color="red">Esc</Text>
        <Text color="gray"> to cancel</Text>
      </Box>
    </Box>
  );
}
