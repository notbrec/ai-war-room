// ─── Board — the panel every dashboard tile sits in ─────────────────────────
// Eyebrow · title · one line of context on the left, controls on the right,
// the content, and an optional footer with a link onward. Same raised
// surface as the rest of the site.

import { EASE } from './design.jsx';

export function Board({ eyebrow, title, sub, right, foot, children, area, className = '', style, bodyStyle, flush = false, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`aiwar-surface aw-board ${className}`} style={{ gridArea: area, ...style }} {...rest}>
      {(eyebrow || title || right) && (
        <header className="aw-board-head">
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="aw-board-eyebrow">{eyebrow}</div>}
            {title && <h3 className="aw-board-title">{title}</h3>}
            {sub && <p className="aw-board-sub">{sub}</p>}
          </div>
          {right && <div className="aw-board-right">{right}</div>}
        </header>
      )}
      <div className="aw-board-body" style={{ padding: flush ? 0 : undefined, ...bodyStyle }}>{children}</div>
      {foot && <footer className="aw-board-foot">{foot}</footer>}
    </Tag>
  );
}

/** The mono "MORE →" link used in board heads and feet. */
export function BoardLink({ children, onClick, title }) {
  return <button type="button" className="aw-link" onClick={onClick} title={title}>{children}</button>;
}

/** A small mono tag beside a name: NEW, OPEN, … */
export function Tag({ children, color = 'var(--muted)' }) {
  return <span className="aw-tag" style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>{children}</span>;
}

export const fadeUp = (i = 0) => ({ opacity: 0, animation: `aiwar-fade-up 280ms ${EASE} ${Math.min(i, 12) * 30}ms both` });
