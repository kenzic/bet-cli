import React, { useMemo, useState } from 'react';
import chalk from 'chalk';
import { Box, Text, useInput } from 'ink';

export type SelectGroup = {
  type: 'group';
  label: string;
  color?: string;
};

export type SelectEntry<T> = {
  type: 'item';
  label: string;
  value: T;
  hint?: string;
};

export type SelectRow<T> = SelectGroup | SelectEntry<T>;

type SelectListProps<T> = {
  title?: string;
  items: SelectRow<T>[];
  onSelect: (item: SelectEntry<T>) => void;
  onCancel?: () => void;
  maxRows?: number;
};

const DEFAULT_MAX_ROWS = 18;

export function SelectList<T>({
  title,
  items,
  onSelect,
  onCancel,
  maxRows = DEFAULT_MAX_ROWS,
}: SelectListProps<T>): React.ReactElement {
  const selectableIndices = useMemo(
    () => items.map((item, index) => (item.type === 'item' ? index : -1)).filter((idx) => idx >= 0),
    [items]
  );
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (selectableIndices.length === 0) {
      if (key.escape || (key.ctrl && input === 'c')) {
        onCancel?.();
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setCursor((prev) => (prev - 1 + selectableIndices.length) % selectableIndices.length);
    } else if (key.downArrow || input === 'j') {
      setCursor((prev) => (prev + 1) % selectableIndices.length);
    } else if (key.return) {
      const itemIndex = selectableIndices[cursor];
      const item = items[itemIndex];
      if (item && item.type === 'item') {
        onSelect(item);
      }
    } else if (key.escape || (key.ctrl && input === 'c')) {
      onCancel?.();
    }
  });

  if (items.length === 0) {
    return (
      <Box flexDirection="column">
        {title && <Text>{chalk.bold(title)}</Text>}
        <Text>No results.</Text>
        <Box marginTop={1}>
        <Text>{chalk.dim('Press Esc to exit.')}</Text>
        </Box>
      </Box>
    );
  }

  const selectedRowIndex = selectableIndices[cursor] ?? 0;
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
      {windowed.map((row, idx) => {
        const absoluteIndex = windowStart + idx;
        const selected = row.type === 'item' && absoluteIndex === selectedRowIndex;

        if (row.type === 'group') {
          const colored = row.color ? chalk.hex(row.color)(`[${row.label}]`) : `[${row.label}]`;
          return (
            <Box key={`group-${absoluteIndex}`} marginTop={idx === 0 ? 0 : 1}>
              <Text>{chalk.bold(colored)}</Text>
            </Box>
          );
        }

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
        <Text>{chalk.dim('Use ↑/↓ or j/k. Enter to select. Esc to cancel.')}</Text>
      </Box>
    </Box>
  );
}
