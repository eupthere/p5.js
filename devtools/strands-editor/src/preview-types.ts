export const SHADER_CAPTURE_KIND = {
  Compute: 'compute',
  Filter: 'filter',
  Material: 'material',
  Normal: 'normal',
  Color: 'color',
  Stroke: 'stroke',
} as const;

export type ShaderCaptureKind =
  (typeof SHADER_CAPTURE_KIND)[keyof typeof SHADER_CAPTURE_KIND];

export const SHADER_CAPTURE_KINDS = Object.values(
  SHADER_CAPTURE_KIND
) as ShaderCaptureKind[];

export type ShaderCapture = {
  id: string;
  kind: ShaderCaptureKind;
  name: string;
  callbackBody: string;
  shaderSource: string;
};

export type PreviewState = {
  captures: ShaderCapture[];
  error: string;
};

export type ShaderBuilderMethodName =
  `build${Capitalize<ShaderCaptureKind>}Shader`;

export function getShaderBuilderMethodName(
  kind: ShaderCaptureKind
): ShaderBuilderMethodName {
  const capitalizedKind = `${kind[0].toUpperCase()}${kind.slice(1)}`;
  return `build${capitalizedKind}Shader` as ShaderBuilderMethodName;
}
