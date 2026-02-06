import React from 'react';
import { render } from 'ink';
import { SelectEntry, SelectList, SelectRow } from './select.js';
import { SearchSelect } from './search.js';

export async function promptSelect<T>(
  items: SelectRow<T>[],
  options: { title?: string; maxRows?: number } = {}
): Promise<SelectEntry<T> | undefined> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <SelectList
        title={options.title}
        items={items}
        maxRows={options.maxRows}
        onSelect={(item) => {
          unmount();
          resolve(item);
        }}
        onCancel={() => {
          unmount();
          resolve(undefined);
        }}
      />,
      {
        stdout: process.stderr,
      }
    );
  });
}

export async function promptSearch<T>(
  items: SelectEntry<T>[],
  options: {
    title?: string;
    initialQuery?: string;
    maxRows?: number;
    filter: (items: SelectEntry<T>[], query: string) => SelectEntry<T>[];
  }
): Promise<SelectEntry<T> | undefined> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <SearchSelect
        title={options.title}
        allItems={items}
        filter={options.filter}
        maxRows={options.maxRows}
        initialQuery={options.initialQuery}
        onSelect={(item) => {
          unmount();
          resolve(item);
        }}
        onCancel={() => {
          unmount();
          resolve(undefined);
        }}
      />,
      {
        stdout: process.stderr,
      }
    );
  });
}
