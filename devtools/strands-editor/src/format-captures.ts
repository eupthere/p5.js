import type { ShaderCapture } from './preview-types';

export function joinCaptureSections(
  captures: ShaderCapture[],
  field: 'callbackBody' | 'shaderSource'
) {
  return captures
    .map((capture) => {
      const content = capture[field]?.trim();
      if (!content) {
        return `// ${capture.kind}: ${capture.name}\n// No output captured yet.`;
      }

      return [
        `// ${capture.kind}: ${capture.name}`,
        '// -----------------------------------------------------------------------------',
        content,
      ].join('\n');
    })
    .join('\n\n// =============================================================================\n\n');
}
