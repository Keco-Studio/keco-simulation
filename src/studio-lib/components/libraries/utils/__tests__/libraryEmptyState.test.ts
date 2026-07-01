import { describe, expect, it } from 'vitest';
import {
  LIBRARY_NO_DATA_MESSAGE,
  shouldShowLibraryNoDataState,
} from '../libraryEmptyState';

describe('library empty state', () => {
  it('shows no-data state when an imported library has schema but no rows', () => {
    expect(shouldShowLibraryNoDataState({ propertyCount: 3, rowCount: 0 })).toBe(true);
    expect(LIBRARY_NO_DATA_MESSAGE).toBe('库中无数据');
  });

  it('does not replace schema setup state when no columns exist', () => {
    expect(shouldShowLibraryNoDataState({ propertyCount: 0, rowCount: 0 })).toBe(false);
  });
});
