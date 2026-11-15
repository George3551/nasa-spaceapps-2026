/**
 * AEGIS - NASA Space Apps Challenge 2026
 * Component: Shared inline SVG icons.
 * Implementation: team-directed, AI-assisted (Anthropic Claude Code).
 * Team concept and requirements; exact line-level authorship remains unverified.
 * See AI_DISCLOSURE.md and AI_DISCLOSURE_MANIFEST.json for evidence and attribution limits.
 */
import type { IconName } from '../navigation'

type Name = IconName | 'menu' | 'close' | 'check' | 'info' | 'warning' | 'arrow' | 'clock' | 'lock'
const paths: Record<Name, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  health: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM5 12h4l1.5-3 3 6 1.5-3h4',
  alert: 'M12 3 2 20h20L12 3zM12 10v4M12 17v.5',
  review: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-6',
  body: 'M12 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 10h12M12 8v7M9 21l3-6 3 6',
  test: 'M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  move: 'M6 20V9l5-4M11 5l4 5h4M6 13h5',
  sensor: 'M4 12h3l2-6 4 12 2-6h5',
  ship: 'M12 2c4 3 5 8 5 12l-2 4H9l-2-4c0-4 1-9 5-12zM12 9v3M9 18l-2 4M15 18l2 4',
  sim: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17 19 7',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5',
  warning: 'M12 3 2 20h20L12 3zM12 10v4M12 17v.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
}
export function Icon({ name, size = 16 }: { name: Name; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
