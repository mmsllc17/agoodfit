import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Avatar, Badge, Button, Card, Checkbox, Field, Modal, Notice, PageHead } from '../components/ui';
import { useAccount } from '../store';
import { colorFor, EDITABLE_ROLES, fmtAgo, fmtShort, initialsOf, PERM_ROWS, uid } from '../lib';
import type { EditableRole, Role, TeamMember } from '../types';

/** A few app members to search when inviting. In the real portal this searches the member directory. */
const DIRECTORY = ['Nia Patel', 'Camille Laurent', 'Devon Brooks', 'Priya Shah', 'Marcus Lee', 'Ana Souza', 'Ricky Torres', 'Jules Park', 'Omar Haddad', 'Lena Fischer'];

export function Team() {
  const { account, team, me, state, update, toast, log, can, readOnly } = useAccount();
  const [invite, setInvite] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const isOwner = !readOnly && me?.role === 'Owner';
  const canManage = can('team');
  const grid = state.perms[account.id];
  const activity = state.activity.filter((a) => a.accountId === account.id).slice(0, 8);

  const setRole = (t: TeamMember, role: Role) => {
    update((d) => {
      d.team.find((x) => x.id === t.id)!.role = role;
      log(d, `made ${t.name} ${role === 'Admin' || role === 'Organizer' ? 'an' : 'a'} ${role.toLowerCase()}`);
    });
    toast(`${t.name.split(' ')[0]} is now ${role === 'Admin' || role === 'Organizer' ? 'an' : 'a'} ${role.toLowerCase()}`);
  };

  const flip = (perm: (typeof PERM_ROWS)[number]['id'], role: EditableRole) => {
    update((d) => {
      d.perms[account.id][perm][role] = !d.perms[account.id][perm][role];
    });
  };

  const remove = () => {
    if (!removing) return;
    const t = removing;
    update((d) => {
      d.team = d.team.filter((x) => x.id !== t.id);
      log(d, t.pending ? `canceled the invite for ${t.name}` : `removed ${t.name} from the team`);
    });
    toast(t.pending ? 'Invite canceled' : `${t.name.split(' ')[0]} was removed`);
    setRemoving(null);
  };

  return (
    <>
      <PageHead
        eyebrow={account.kind === 'house' ? `${account.name} · Parent company` : account.name}
        title="Team"
        action={
          canManage && (
            <Button kind="outline" icon="plus" onClick={() => setInvite(true)}>
              Add someone
            </Button>
          )
        }
      />
      {!canManage && !readOnly && <Notice>Your role can see the team but can’t change it. Owners and admins manage the team.</Notice>}

      <div className="cols">
        <div className="cols__main">
          <Card title="People" sub={`Members who can act for ${account.kind === 'house' ? 'the club' : account.name}`} pad={false}>
            <div className="table">
              <div className="table__head grid-team">
                <span>Name</span>
                <span>Role</span>
                <span />
              </div>
              {team.map((t) => {
                const self = t.id === me?.id;
                const editable = canManage && t.role !== 'Owner' && !self;
                return (
                  <div className="table__row grid-team" key={t.id}>
                    <span className="person">
                      <Avatar initials={t.initials} color={t.color} size={40} />
                      <span>
                        <span className="row-title">
                          {t.name}
                          {self && <span className="muted"> (you)</span>}
                          {t.pending && (
                            <Badge tone="gold">
                              Invite pending
                            </Badge>
                          )}
                        </span>
                        <span className="row-meta">{t.sub}</span>
                      </span>
                    </span>
                    <span>
                      {editable ? (
                        <select aria-label={`Role for ${t.name}`} className="input input--sm" value={t.role} onChange={(e) => setRole(t, e.target.value as Role)}>
                          {EDITABLE_ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={'tag ' + (t.role === 'Owner' ? 'tag--olive' : 'tag--muted')}>{t.role}</span>
                      )}
                    </span>
                    <span className="right">
                      {editable && (
                        <button type="button" className="link" onClick={() => setRemoving(t)}>
                          {t.pending ? 'Cancel invite' : 'Remove'}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="What each role can do" sub={isOwner ? 'Owners can do everything. Changes apply right away.' : 'Owners can do everything. Only owners can change this grid.'} pad={false}>
            <div className="perm">
              <div className="perm__row perm__row--head">
                <span>Permission</span>
                <span>Owner</span>
                {EDITABLE_ROLES.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
              {PERM_ROWS.map((p, i) => (
                <div key={p.id}>
                  {i === 2 && (
                    <div className="perm__row perm__row--all">
                      <span className="row-title">Run assigned rides</span>
                      <span className="perm__span">All roles: attendance, ride chat, day-of updates</span>
                    </div>
                  )}
                  <div className="perm__row">
                    <span className="row-title">{p.label}</span>
                    <span className="perm__cell">
                      <Icon name="lock" size={16} color="var(--ink-muted)" />
                      <span className="sr-only">Always on for owners</span>
                    </span>
                    {EDITABLE_ROLES.map((r) => (
                      <span className="perm__cell" key={r}>
                        <Checkbox on={grid[p.id][r]} disabled={!isOwner} onChange={() => flip(p.id, r)} label={`${r}: ${p.label}`} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="cols__side">
          <Card title="Activity">
            {activity.length ? (
              <ul className="feed">
                {activity.map((a) => (
                  <li key={a.id}>
                    <Avatar initials={a.initials} color={a.color} size={32} />
                    <span>
                      <span>
                        <b>{a.who}</b> {a.text}
                      </span>
                      <span className="row-meta">{fmtAgo(a.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Team actions show up here.</p>
            )}
          </Card>
        </div>
      </div>

      {invite && (
        <InviteModal
          onClose={() => setInvite(false)}
          existing={team.map((t) => t.name)}
          onSend={(name, role) => {
            update((d) => {
              d.team.push({ id: uid('tm'), accountId: account.id, name, initials: initialsOf(name), color: colorFor(name), sub: `Invited ${fmtShort(new Date().toISOString())}`, role, pending: true });
              log(d, `invited ${name} as ${role === 'Admin' || role === 'Organizer' ? 'an' : 'a'} ${role.toLowerCase()}`);
            });
            toast(`Invite sent to ${name}. They’ll get it in the app.`);
            setInvite(false);
          }}
        />
      )}

      {removing && (
        <Modal
          title={removing.pending ? `Cancel the invite for ${removing.name}?` : `Remove ${removing.name}?`}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setRemoving(null)}>
                Keep
              </Button>
              <Button kind="danger" onClick={remove}>
                {removing.pending ? 'Cancel invite' : 'Remove'}
              </Button>
            </>
          }
        >
          <p>
            {removing.pending
              ? 'The invite in their app will disappear.'
              : `${removing.name.split(' ')[0]} stays a member of the club but can’t act for it anymore. Rides they’re leading keep them as ride leader until you change it.`}
          </p>
        </Modal>
      )}
    </>
  );
}

function InviteModal({ onClose, onSend, existing }: { onClose: () => void; onSend: (name: string, role: EditableRole) => void; existing: string[] }) {
  const [q, setQ] = useState('');
  const [pick, setPick] = useState('');
  const [role, setRole] = useState<EditableRole>('Ride leader');
  const results = DIRECTORY.filter((n) => !existing.includes(n) && n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5);

  return (
    <Modal
      title="Add someone to the team"
      onClose={onClose}
      footer={
        <>
          <Button kind="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!pick} onClick={() => onSend(pick, role)}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="form">
        <Field label="Find a member" hint="They need an A Good Fit account. The invite shows up in their app.">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Search by name"
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPick('');
              }}
            />
          )}
        </Field>
        <div className="pick-list" role="listbox" aria-label="Members">
          {results.map((n) => (
            <button key={n} type="button" role="option" aria-selected={pick === n} className={'pick' + (pick === n ? ' pick--on' : '')} onClick={() => setPick(n)}>
              <Avatar initials={initialsOf(n)} color={colorFor(n)} size={32} />
              <span className="row-title">{n}</span>
              {pick === n && <Icon name="check" size={18} color="var(--olive)" stroke={2.4} />}
            </button>
          ))}
          {results.length === 0 && <p className="muted small">No members match “{q}”.</p>}
        </div>
        <Field label="Role">
          {(id) => (
            <select id={id} className="input" value={role} onChange={(e) => setRole(e.target.value as EditableRole)}>
              {EDITABLE_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          )}
        </Field>
      </div>
    </Modal>
  );
}
