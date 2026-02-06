import React, { useMemo, useState } from 'react';
import chalk from 'chalk';
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
      <Box flexDirection="column">
        {title && <Text>{chalk.bold(title)}</Text>}
        <Text>{`Search: ${query}`}</Text>
        <Text>No results.</Text>
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
    <Box flexDirection="column">
      {title && <Text>{chalk.bold(title)}</Text>}
      <Text>{`Search: ${query}`}</Text>
      {showCount && <Text>{chalk.dim(`${items.length} result(s)`)}</Text>}
      {windowed.map((row, idx) => {
        const absoluteIndex = windowStart + idx;
        const selected = absoluteIndex === selectedRowIndex;
        return (
          <Box key={`item-${absoluteIndex}`}>
            <Text>
              {selected ? chalk.cyan.bold('› ') : '  '}
              {selected ? chalk.cyan.bold(row.label) : row.label}
            </Text>
            {row.hint ? <Text>{chalk.dim(` ${row.hint}`)}</Text> : null}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text>{chalk.dim('Type to filter. Use ↑/↓ or j/k. Enter to select. Esc to cancel.')}</Text>
      </Box>
    </Box>
  );
}
