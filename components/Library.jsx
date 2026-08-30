'use client';

import { useState } from 'react';

const KIND_LABEL = { character: '🦸', backdrop: '🏞️', prop: '🚗', effect: '💥' };

export default function Library({ items, removeItem, renameItem }) {
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState(null);
  const [editing, setEditing] = useState(null);

  let list = items;
  if (filter !== 'all') list = list.filter((i) => i.tag === filter);
  if (roleFilter) list = list.filter((i) => i.tag === 'character' && i.role === roleFilter);

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        {['all', 'character', 'backdrop', 'prop', 'effect'].map((f) => (
          <button
            key={f}
            className="chip"
            aria-pressed={filter === f}
            onClick={() => { setFilter(f); if (f !== 'character' && f !== 'all') setRoleFilter(null); }}
          >
            {f === 'all' ? 'All' : `${KIND_LABEL[f]} ${f[0].toUpperCase() + f.slice(1)}s`}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {['goodie', 'baddie', 'sidekick', 'extra'].map((r) => (
          <button
            key={r}
            className="chip"
            aria-pressed={roleFilter === r}
            onClick={() => setRoleFilter(roleFilter === r ? null : r)}
          >
            {{ goodie: '😇 Goodies', baddie: '😈 Baddies', sidekick: '🦾 Sidekicks', extra: '🧍 Extras' }[r]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty">
          Nothing here yet.<br />Go to the Draw tab and make something! ✏️
        </div>
      ) : (
        <div className="grid">
          {list.map((c) => (
            <div key={c.id} className="card">
              <button className="x" title="Delete" onClick={() => removeItem(c.id)}>×</button>
              <div className="thumb"><img src={c.dataUrl} alt={c.name} /></div>
              {editing === c.id ? (
                <input
                  className="nm-edit"
                  autoFocus
                  defaultValue={c.name}
                  maxLength={24}
                  onBlur={(e) => { renameItem(c.id, e.target.value.trim() || c.name); setEditing(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                />
              ) : (
                <button className="nm" onClick={() => setEditing(c.id)} title="Tap to rename">{c.name}</button>
              )}
              <div className="badges">
                <span className="badge">{KIND_LABEL[c.tag]} {c.tag}</span>
                {c.role && <span className={`badge role-${c.role}`}>{c.role}</span>}
                {c.subType && <span className="sub">{c.subType}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .card {
          background: #fff; border: var(--line); border-radius: 10px;
          box-shadow: var(--shadow-panel); padding: 10px; text-align: center; position: relative;
        }
        .card:nth-child(3n) { transform: rotate(.5deg); }
        .card:nth-child(3n+1) { transform: rotate(-.5deg); }
        .thumb {
          aspect-ratio: 1; border-radius: 8px; overflow: hidden;
          background: repeating-conic-gradient(#efe9dc 0% 25%, #fff 0% 50%) 50%/16px 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .thumb img { max-width: 92%; max-height: 92%; object-fit: contain; }
        .nm {
          font-family: var(--font-body); font-weight: 800; font-size: 15px;
          border: none; background: none; cursor: pointer; margin-top: 8px;
          padding: 2px 6px; border-radius: 6px;
        }
        .nm:hover { background: var(--yellow-soft); }
        .nm-edit {
          margin-top: 8px; width: 100%; font-family: var(--font-body); font-weight: 800;
          font-size: 14px; padding: 4px 6px; border: 2px solid var(--ink); border-radius: 6px;
        }
        .badges { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; margin-top: 5px; }
        .badge {
          font-size: 10.5px; font-weight: 800; border: 2px solid var(--ink);
          border-radius: 999px; padding: 1.5px 8px; background: var(--newsprint);
        }
        .badge.role-goodie { background: var(--green); color: #fff; }
        .badge.role-baddie { background: var(--red); color: #fff; }
        .badge.role-sidekick { background: var(--blue); color: #fff; }
        .badge.role-extra { background: var(--ink); color: #fff; }
        .sub { font-size: 10px; font-weight: 700; color: var(--purple); align-self: center; }
        .x {
          position: absolute; top: -9px; right: -9px; width: 26px; height: 26px;
          border-radius: 50%; border: 2px solid var(--ink); background: #fff;
          font-weight: 800; cursor: pointer; line-height: 1; z-index: 2;
        }
        .x:hover { background: var(--red); color: #fff; }
        .empty {
          background: #fff; border: 3px dashed var(--purple); border-radius: 12px;
          padding: 40px; text-align: center; font-weight: 800; color: var(--purple);
        }
      `}</style>
    </div>
  );
}
