import React, { useMemo, useState } from 'react';
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
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
        {title ? (
          <Box marginBottom={1}>
            <Text bold color="cyan">
              {title}
            </Text>
          </Box>
        ) : null}
        <Text color="yellow">No results.</Text>
        <Box marginTop={1}>
          <Text color="gray">Press Esc to exit.</Text>
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
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      {title ? (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {title}
          </Text>
        </Box>
      ) : null}
      <Box flexDirection="column">
        {windowed.map((row, idx) => {
          const absoluteIndex = windowStart + idx;
          const selected = row.type === 'item' && absoluteIndex === selectedRowIndex;

          if (row.type === 'group') {
            return (
              <Box key={`group-${absoluteIndex}`} marginTop={idx === 0 ? 0 : 1}>
                <Text bold color={row.color ?? 'cyan'}>
                  [{row.label}]
                </Text>
              </Box>
            );
          }

          return (
            <Box key={`item-${absoluteIndex}`} flexDirection="row">
              <Text color={selected ? 'green' : undefined} bold={selected}>
                {selected ? '› ' : '  '}
                {row.label}
              </Text>
              {row.hint ? (
                <Text color="gray"> {row.hint}</Text>
              ) : null}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
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
