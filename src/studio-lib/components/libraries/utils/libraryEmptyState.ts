export const LIBRARY_NO_DATA_MESSAGE = '库中无数据';

export function shouldShowLibraryNoDataState(input: {
  propertyCount: number;
  rowCount: number;
}): boolean {
  return input.propertyCount > 0 && input.rowCount === 0;
}
