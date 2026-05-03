import type { EditorHighlightRange } from '../components/EditorPanel';

export function findChangedRanges(
  previousValue: string,
  nextValue: string
): EditorHighlightRange[] {
  if (!previousValue || previousValue === nextValue) {
    return [];
  }

  let start = 0;
  const maxPrefixLength = Math.min(previousValue.length, nextValue.length);
  while (
    start < maxPrefixLength &&
    previousValue[start] === nextValue[start]
  ) {
    start += 1;
  }

  let previousEnd = previousValue.length;
  let nextEnd = nextValue.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previousValue[previousEnd - 1] === nextValue[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  if (start === nextEnd) {
    return [];
  }

  return [
    {
      from: start,
      to: nextEnd,
    },
  ];
}
