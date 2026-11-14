import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import type { EventStatus } from '../types';

export function Avatar({ initials, color, size = 40, square = false }: { initials: string; color: string; size?: number; square?: boolean }) {
  return (
    <span
      className={'avatar' + (square ? ' avatar--sq' : '')}
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

type Tone = 'olive' | 'gold' | 'muted' | 'clay' | 'danger';

export function Badge({ tone = 'olive', dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

const STATUS: Record<EventStatus, [string, Tone]> = {
  live: ['Live', 'olive'],
  scheduled: ['Scheduled', 'olive'],
  review: ['In review', 'gold'],
  draft: ['Draft', 'muted'],
  ended: ['Ended', 'muted'],
  canceled: ['Canceled', 'danger'],
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const [label, tone] = STATUS[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  kind = 'primary',
  icon,
  size = 'md',
  children,
  className = '',
  ...rest
}: { kind?: BtnKind; icon?: IconName; size?: 'sm' | 'md' | 'lg' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn btn--${kind} btn--${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

export function LinkButton({ href, kind = 'primary', icon, size = 'md', children }: { href: string; kind?: BtnKind; icon?: IconName; size?: 'sm' | 'md' | 'lg'; children: ReactNode }) {
  return (
    <a href={href} className={`btn btn--${kind} btn--${size}`}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </a>
  );
}

export function Card({ title, sub, action, children, className = '', pad = true }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${pad ? 'card--pad' : ''} ${className}`}>
      {(title || action) && (
        <div className={'card__head' + (pad ? '' : ' card__head--pad')}>
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {sub && <p className="card__sub">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHead({ eyebrow, title, sub, back, action, badge }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; back?: { href: string; label: string }; action?: ReactNode; badge?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {back && (
          <a className="back" href={back.href}>
            <Icon name="back" size={16} />
            {back.label}
          </a>
        )}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <div className="page-head__row">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action && <div className="page-head__action">{action}</div>}
    </header>
  );
}

export function Field({ label, hint, error, children, id }: { label: string; hint?: ReactNode; error?: string; children: (id: string) => ReactNode; id?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="field">
      <label htmlFor={fid} className="field__label">
        {label}
      </label>
      {children(fid)}
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} className={'chip' + (on ? ' chip--on' : '')} onClick={onClick}>
      {children}
    </button>
  );
}

export function Stat({ label, value, note, tone = 'olive' }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'olive' | 'muted' }) {
  return (
    <div className="stat card card--pad">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {note && <div className={`stat__note stat__note--${tone}`}>{note}</div>}
    </div>
  );
}

export function Checkbox({ on, onChange, label, disabled }: { on: boolean; onChange?: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} disabled={disabled} className={'check' + (on ? ' check--on' : '')} onClick={onChange}>
      {on && <Icon name="check" size={14} color="#fff" stroke={2.8} />}
    </button>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={'switch' + (on ? ' switch--on' : '')} onClick={onChange}>
      <span />
    </button>
  );
}

export function Empty({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="icon-circle icon-circle--olive">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Notice({ icon = 'lock', tone = 'muted', children }: { icon?: IconName; tone?: 'muted' | 'gold' | 'olive'; children: ReactNode }) {
  return (
    <div className={`notice notice--${tone}`} role="note">
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Meter({ value, max, tone = 'olive' }: { value: number; max: number; tone?: 'olive' | 'gold' }) {
  const w = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${w}%` }} />
    </div>
  );
}
