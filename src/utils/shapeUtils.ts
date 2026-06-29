/**
 * Shared shape-type utilities used by both the palette (NodePalette) and the
 * canvas node renderer (DynamicShapeNode).
 *
 * `detectShapeType` maps a Django ShapeDefinition slug + label to one of six
 * visual variants.  The friendly display names are also kept here so both
 * consumers stay in sync.
 */

export type ShapeVariant =
  | 'terminator'
  | 'process'
  | 'decision'
  | 'data'
  | 'database'
  | 'predefined';

export function detectShapeType(slug: string, label: string): ShapeVariant {
  const hay = `${slug} ${label}`.toLowerCase().replace(/[-_]/g, '');

  // Parallel-execution control nodes: verdict (fan-in) reads as a terminal pill,
  // the fork/split (fan-out) reads as a diamond branch.
  if (hay.includes('verdict'))
    return 'terminator';
  if (hay.includes('fork') || hay.includes('parallelsplit') || hay.includes('split'))
    return 'decision';
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
