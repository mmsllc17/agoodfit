export type Role = 'Owner' | 'Admin' | 'Organizer' | 'Ride leader';
export type EditableRole = Exclude<Role, 'Owner'>;

export type Perm =
  | 'create'
  | 'approve'
  | 'announce'
  | 'moderate'
  | 'editClub'
  | 'feature'
  | 'data'
  | 'team'
  | 'billing';

export type PermGrid = Record<Perm, Record<EditableRole, boolean>>;

export interface Account {
  id: string;
  name: string;
  initials: string;
  color: string;
  kind: 'business' | 'house';
  plan: 'Partner' | 'House' | 'Pay as you go';
  verified: boolean;
  category: string;
  address: string;
  web: string;
  email: string;
  /** Team member id of the signed-in person on this account. */
  meId: string;
  renewsOn?: string;
}

export interface Club {
  accountId: string;
  name: string;
  activity: string;
  description: string;
  meetingSpot: string;
  announcement: string;
  goalLabel: string;
  goalTarget: number;
  goalCurrent: number;
  members: number;
}

export type EventStatus = 'draft' | 'review' | 'live' | 'scheduled' | 'ended' | 'canceled';
export type PackageId = 'spotlight' | 'boost' | 'partner' | 'house';

export interface EventStats {
  /** Views per day since the feature went live. */
  viewsByDay: number[];
  taps: number;
  rsvps: number;
  checkins: number;
  hoods: [string, number][];
  interests: [string, number][];
}

export interface AppEvent {
  id: string;
  accountId: string;
  kind: 'club' | 'featured';
  title: string;
  start: string;
  place: string;
  details: string;
  status: EventStatus;
  going: number;
  createdAt: string;
  // Featured
  pkg?: PackageId;
  hoods?: string[];
  interests?: string[];
  featureStart?: string;
  stats?: EventStats;
  // Club rides
  activity?: string;
  leaderId?: string;
  leaderName?: string;
  route?: string;
  distance?: string;
  pace?: string;
  noDrop?: boolean;
  capacity?: number;
  fromSuggestionId?: string;
}

export interface Suggestion {
  id: string;
  accountId: string;
  memberName: string;
  initials: string;
  color: string;
  history: string;
  title: string;
  start: string;
  place: string;
  route: string;
  note: string;
  status: 'new' | 'approved' | 'declined';
  eventId?: string;
}

export interface TeamMember {
  id: string;
  accountId: string;
  name: string;
  initials: string;
  color: string;
  sub: string;
  role: Role;
  pending?: boolean;
}

export interface Activity {
  id: string;
  accountId: string;
  who: string;
  initials: string;
  color: string;
  text: string;
  at: string;
}

export interface Invoice {
  id: string;
  accountId: string;
  date: string;
  desc: string;
  amount: number;
  status: 'Paid' | 'Upcoming';
}

export interface NameFlag {
  id: string;
  accountId: string;
  title: string;
  by: string;
  start: string;
  status: 'open' | 'asked' | 'ok';
}

export interface NotifPrefs {
  review: boolean;
  suggestions: boolean;
  weekly: boolean;
  billing: boolean;
}

export interface State {
  version: number;
  signedIn: boolean;
  accountId: string;
  accounts: Account[];
  clubs: Club[];
  events: AppEvent[];
  suggestions: Suggestion[];
  team: TeamMember[];
  perms: Record<string, PermGrid>;
  activity: Activity[];
  invoices: Invoice[];
  flags: NameFlag[];
  notif: Record<string, NotifPrefs>;
}
