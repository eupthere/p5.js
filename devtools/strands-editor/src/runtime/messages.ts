export const PREVIEW_SOURCE_MESSAGE_TYPE = '__strands-editor-source__';

export type PreviewSourceMessage = {
  type: typeof PREVIEW_SOURCE_MESSAGE_TYPE;
  source: string;
};

export function isPreviewSourceMessage(
  value: unknown
): value is PreviewSourceMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'source' in value &&
    (value as { type?: unknown }).type === PREVIEW_SOURCE_MESSAGE_TYPE &&
    typeof (value as { source?: unknown }).source === 'string'
  );
}
