'use client';

import { useRef, useState } from 'react';
import { SUB_TYPES, SUB_HINTS } from '@/lib/store';
import { cleanupBackground, exportSprite, looksUncut, recutDataUrl } from '@/lib/sprites';
import { offlineNames } from '@/lib/offline';

const KIND_LABEL = { character: '🦸', backdrop: '🏞️', prop: '🚗', effect: '💥' };

/** Photo file → cleaned, cropped, transparent sprite dataURL. */
async function processFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const S = 560;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const s = Math.min(S / img.width, S / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
    cleanupBackground(ctx, S, S);
    return exportSprite(ctx, S, S, { pop: true });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function Library({ items, removeItem, renameItem, updateItem, addItems, startEdit, flash }) {
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState(null);
  const [editing, setEditing] = useState(null);       // inline name edit id
  const [sorting, setSorting] = useState(null);       // item being sorted/edited in modal
  const [draft, setDraft] = useState(null);           // modal working copy
  const [progress, setProgress] = useState(null);     // {done,total}
  const [cutting, setCutting] = useState(null);       // {done,total} for re-cut
  const bulkRef = useRef(null);

  const autoCutout = async () => {
    // Find items that still look like uncut photo rectangles (nearly fully
    // opaque). Real cutouts and in-app drawings are mostly transparent and
    // are skipped automatically, so nothing good can be damaged.
    setCutting({ done: 0, total: 0 });
    const targets = [];
    for (const it of items) {
      try { if (await looksUncut(it.dataUrl)) targets.push(it); } catch {}
    }
    if (!targets.length) {
      setCutting(null);
      flash('No photo rectangles found — everything is already cut out! ✂️');
      return;
    }
    setCutting({ done: 0, total: targets.length });
    let fixed = 0, skipped = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        const fresh = await recutDataUrl(targets[i].dataUrl);
        if (fresh) { updateItem(targets[i].id, { dataUrl: fresh }); fixed++; }
        else skipped++;
      } catch { skipped++; }
      setCutting({ done: i + 1, total: targets.length });
    }
    setCutting(null);
    flash(`✂️ ${fixed} drawing${fixed !== 1 ? 's' : ''} re-cut!${skipped ? ` ${skipped} skipped (couldn't cut safely)` : ''}`);
  };

  const unsortedCount = items.filter((i) => i.unsorted).length;

  let list = items;
  if (filter === 'unsorted') list = list.filter((i) => i.unsorted);
  else if (filter !== 'all') list = list.filter((i) => i.tag === filter);
  if (roleFilter) list = list.filter((i) => i.tag === 'character' && i.role === roleFilter);

  const onBulk = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setProgress({ done: 0, total: files.length });
    const made = [];
    let skipped = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const data = await processFile(files[i]);
        if (data) {
          made.push({
            id: Date.now() + i,
            name: `Drawing ${items.length + made.length + 1}`,
            tag: 'character',
            subType: 'person',
            role: 'goodie',
            dataUrl: data,
            unsorted: true,
          });
        } else skipped++;
      } catch { skipped++; }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    if (made.length) {
      addItems(made);
      setFilter('unsorted');
      flash(`${made.length} drawing${made.length > 1 ? 's' : ''} in! Tap each to sort 🗂️`);
    }
    if (skipped) flash(`${skipped} photo${skipped > 1 ? 's' : ''} looked empty after cleanup — try a clearer shot`);
  };

  const openSort = (item) => {
    setSorting(item.id);
    setDraft({
      name: item.name,
      tag: item.tag,
      subType: item.subType || SUB_TYPES[item.tag][0].id,
      role: item.role || 'goodie',
      names: [],
    });
  };
  const saveSort = () => {
    const patch = {
      name: draft.name.trim() || 'My Drawing',
      tag: draft.tag,
      subType: draft.subType,
      unsorted: false,
    };
    if (draft.tag === 'character') patch.role = draft.role;
    else patch.role = undefined;
    updateItem(sorting, patch);
    setSorting(null);
    flash('Sorted! 🧸');
  };

  const [recutting, setRecutting] = useState(false);
  const forceRecut = async () => {
    const it = items.find((i) => i.id === sorting);
    if (!it) return;
    setRecutting(true);
    try {
      const fresh = await recutDataUrl(it.dataUrl);
      if (fresh) { updateItem(it.id, { dataUrl: fresh }); flash('Re-cut! ✂️'); }
      else flash("Couldn't cut this one safely — try re-uploading the photo");
    } catch { flash("Couldn't cut this one — try re-uploading the photo"); }
    setRecutting(false);
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
        <div className="row">
          <button className="btn blue" onClick={() => bulkRef.current.click()} disabled={!!progress || !!cutting}>
            {progress ? `📷 Cleaning ${progress.done} of ${progress.total}…` : '📚 Upload lots of drawings'}
          </button>
          <button className="btn purple" onClick={autoCutout} disabled={!!progress || !!cutting}>
            {cutting ? (cutting.total ? `✂️ Re-cutting ${cutting.done} of ${cutting.total}…` : '✂️ Checking…') : '✂️ Auto-cutout photos'}
          </button>
        </div>
        <input ref={bulkRef} type="file" accept="image/*" multiple hidden onChange={onBulk} />
        {unsortedCount > 0 && (
          <span className="tosort">🆕 {unsortedCount} to sort — tap them below</span>
        )}
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        {['all', ...(unsortedCount ? ['unsorted'] : []), 'character', 'backdrop', 'prop', 'effect'].map((f) => (
          <button
            key={f}
            className="chip"
            aria-pressed={filter === f}
            onClick={() => { setFilter(f); if (f !== 'character' && f !== 'all') setRoleFilter(null); }}
          >
            {f === 'all' ? 'All' : f === 'unsorted' ? `🆕 To sort (${unsortedCount})` : `${KIND_LABEL[f]} ${f[0].toUpperCase() + f.slice(1)}s`}
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
          Nothing here yet.<br />Draw something, or use “Upload lots” to bring in paper drawings! ✏️
        </div>
      ) : (
        <div className="grid">
          {list.map((c) => (
            <div key={c.id} className={`card ${c.unsorted ? 'unsorted' : ''}`}>
              <button className="x" title="Delete" onClick={() => removeItem(c.id)}>×</button>
              {c.unsorted && <span className="newtag">🆕 tap to sort</span>}
              <button className="thumb" onClick={() => openSort(c)} title="Tap to sort / edit">
                <img src={c.dataUrl} alt={c.name} />
              </button>
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
                {c.role && c.tag === 'character' && <span className={`badge role-${c.role}`}>{c.role}</span>}
                {c.subType && <span className="sub">{c.subType}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {sorting && draft && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSorting(null); }}>
          <div className="modal">
            <h3>Sort this drawing 🗂️</h3>
            <div className="sort-preview">
              <img src={items.find((i) => i.id === sorting)?.dataUrl} alt="" />
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button className="btn sm purple" onClick={forceRecut} disabled={recutting}>
                {recutting ? '✂️ Cutting…' : '✂️ Re-cut this drawing'}
              </button>
              <button className="btn sm blue" onClick={() => { const it = items.find((i) => i.id === sorting); setSorting(null); startEdit(it); }}>
                ✏️ Edit drawing
              </button>
            </div>
            <div className="hint" style={{ marginTop: -6, marginBottom: 12 }}>Re-cut trims paper around the outline. Edit opens it on the canvas to erase marks, clean edges, or add colour.</div>
            <div className="field">
              <label htmlFor="snm">Name</label>
              <input
                id="snm"
                type="text"
                maxLength={24}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm purple" onClick={() => setDraft((d) => ({ ...d, names: offlineNames(d.subType) }))}>✨ Suggest names</button>
                {draft.names.map((n) => (
                  <button key={n} className="chip" onClick={() => setDraft((d) => ({ ...d, name: n }))}>{n}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>What is it?</label>
              <div className="row">
                {Object.keys(SUB_TYPES).map((k) => (
                  <button
                    key={k}
                    className="chip"
                    aria-pressed={draft.tag === k}
                    onClick={() => setDraft((d) => ({ ...d, tag: k, subType: SUB_TYPES[k][0].id }))}
                  >
                    {KIND_LABEL[k]} {k}
                  </button>
                ))}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {SUB_TYPES[draft.tag].map((s) => (
                  <button
                    key={s.id}
                    className="chip"
                    aria-pressed={draft.subType === s.id}
                    onClick={() => setDraft((d) => ({ ...d, subType: s.id }))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="hint">{SUB_HINTS[draft.subType]}</div>
            </div>
            {draft.tag === 'character' && (
              <div className="field">
                <label>Role in the story</label>
                <div className="row">
                  {['goodie', 'baddie', 'sidekick', 'extra'].map((r) => (
                    <button
                      key={r}
                      className={`chip role-${r}`}
                      aria-pressed={draft.role === r}
                      onClick={() => setDraft((d) => ({ ...d, role: r }))}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn sm" onClick={() => setSorting(null)}>Cancel</button>
              <button className="btn yellow" onClick={saveSort}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tosort { font-weight: 800; font-size: 13px; color: var(--red); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .card {
          background: #fff; border: var(--line); border-radius: 10px;
          box-shadow: var(--shadow-panel); padding: 10px; text-align: center; position: relative;
        }
        .card:nth-child(3n) { transform: rotate(.5deg); }
        .card:nth-child(3n+1) { transform: rotate(-.5deg); }
        .card.unsorted { border-color: var(--red); border-style: dashed; }
        .newtag {
          position: absolute; top: -10px; left: 8px; z-index: 2;
          font-size: 10px; font-weight: 800; color: #fff; background: var(--red);
          border: 2px solid var(--ink); border-radius: 999px; padding: 1px 8px;
        }
        .thumb {
          display: flex; width: 100%; aspect-ratio: 1; border: none; padding: 0;
          border-radius: 8px; overflow: hidden; cursor: pointer;
          background: repeating-conic-gradient(#efe9dc 0% 25%, #fff 0% 50%) 50%/16px 16px;
          align-items: center; justify-content: center;
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
        .sort-preview {
          background: repeating-conic-gradient(#efe9dc 0% 25%, #fff 0% 50%) 50%/18px 18px;
          border: var(--line); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          padding: 8px; margin-bottom: 14px;
        }
        .sort-preview img { max-width: 130px; max-height: 130px; object-fit: contain; }
        :global(.chip.role-goodie[aria-pressed="true"]) { background: var(--green); color: #fff; }
        :global(.chip.role-baddie[aria-pressed="true"]) { background: var(--red); color: #fff; }
        :global(.chip.role-sidekick[aria-pressed="true"]) { background: var(--blue); color: #fff; }
        :global(.chip.role-extra[aria-pressed="true"]) { background: var(--ink); color: #fff; }
      `}</style>
    </div>
  );
}
