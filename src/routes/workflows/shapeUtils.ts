export type ShapeVariant =
  | 'terminator'
  | 'process'
  | 'decision'
  | 'data'
  | 'database'
  | 'predefined';

export function detectShapeType(slug: string, label: string): ShapeVariant {
  const hay = `${slug} ${label}`.toLowerCase().replace(/[-_]/g, '');

  if (hay.includes('terminator') || hay.includes('terminal') || hay.includes('start') || hay.includes('end'))
    return 'terminator';
  if (hay.includes('decision') || hay.includes('diamond') || hay.includes('condition'))
    return 'decision';
  if (hay.includes('database') || hay.includes('dbconnector') || hay.includes('datastore'))
    return 'database';
  if (hay.includes('predefined') || hay.includes('subprocess') || hay.includes('subroutine'))
    return 'predefined';
  if (hay.includes('data') && (hay.includes('prep') || hay.includes('input') || hay.includes('output') || hay.includes('io')))
    return 'data';

  return 'process';
}

export const SHAPE_FRIENDLY_NAMES: Record<ShapeVariant, string> = {
  terminator: 'Start / End',
  process:    'Action',
  decision:   'Decision',
  data:       'Data Input',
  database:   'Database',
  predefined: 'Sub-Process',
};
