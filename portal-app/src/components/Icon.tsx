/** The A Good Fit line icon set: 24px grid, 1.9px stroke, round caps and joins. */
const PATHS: Record<string, string> = {
  overview: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M21 20H3',
  inbox: 'M4 13l2.5-7h11L20 13 M4 13v5h16v-5h-5l-1 2h-4l-1-2z',
  team: 'M9 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6 M17 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M15.5 14.6c2.3-.3 4.2 1 5 3.9',
  card: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 10h18',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M4.2 4.2l2.1 2.1 M17.7 17.7l2.1 2.1 M2 12h3 M19 12h3 M4.2 19.8l2.1-2.1 M17.7 6.3l2.1-2.1',
  calendar: 'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5z M3.5 10h17 M8 3v4 M16 3v4',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12 M18 6L6 18',
  back: 'M15 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  lock: 'M7 11h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  trash: 'M4 7h16 M9 7V4h6v3 M6.5 7l1 13h9l1-13',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3 M10 16l4-4-4-4 M14 12H4',
  bike: 'M5.5 19.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18.5 19.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M5.5 16l4-7h5.5l3.5 7 M9.5 9l3.5 7 M8 6h3 M15 9l-1-3h2',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  users: 'M12 11a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z M5 20c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5',
  megaphone: 'M4 10v4h3l7 4V6L7 10z M17 9.5a3.5 3.5 0 0 1 0 5',
  sparkle: 'M12 4l1.8 4.6L18.5 10l-4.7 1.6L12 16l-1.8-4.4L5.5 10l4.7-1.4z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 5v6h-6',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  store: 'M4 9l1.5-5h13L20 9 M4 9v11h16V9 M4 9h16 M9.5 20v-6h5v6',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6z',
  pause: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M10 9v6 M14 9v6',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 19, color = 'currentColor', stroke = 1.9 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].split(' M').map((d, i) => (
        <path key={i} d={i ? 'M' + d : d} />
      ))}
    </svg>
  );
}
