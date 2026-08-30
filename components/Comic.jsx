'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import StoryHelper from '@/components/StoryHelper';

/*
 Comic data model (fully serialisable → persistence & export):
 comic = { pages: [ { panels: [ { fill, bgUrl, caption, objs: [ {id,src,x,y,w,flip,fx} ], bubbles: [ {id,text,x,y} ] } ] } ], current: 0 }
 x/y/w are percentages of the panel.
*/

const BLANK_PANEL = () => ({ fill: null, bgUrl: null, caption: null, objs: [], bubbles: [] });
const blankComic = () => ({ pages: [{ panels: Array.from({ length: 4 }, BLANK_PANEL) }], current: 0 });

const FILLS = {
  sky: 'linear-gradient(#8fd8ff,#e8f7ff)',
  grass: 'linear-gradient(#bdeaff 55%,#7ed957 55%)',
  sunset: 'linear-gradient(#ff9e5e,#ffd76b 60%,#ffe9a8)',
  night: 'linear-gradient(#1b1f4a,#3b2f6b)',
  space: 'radial-gradient(circle at 30% 30%,#2a2a5a,#0d0d24)',
  sea: 'linear-gradient(#2f9fd6,#0b5f8a)',
};

let uid = 1;
const nid = () => `${Date.now()}-${uid++}`;

export default function Comic({ items, comic, setComic, flash, goDraw }) {
  const data = comic || blankComic();
  const [sel, setSel] = useState({ panel: 0, obj: null, bubble: null });
  const pageRef = useRef(null);
  const drag = useRef(null);

  const page = data.pages[data.current];
  const cols = page.panels.length <= 2 ? page.panels.length : page.panels.length <= 4 ? 2 : 3;

  const update = useCallback((fn) => {
    setComic((prev) => {
      const d = structuredClone(prev || blankComic());
      fn(d);
      return d;
    });
  }, [setComic]);

  const updatePanel = (pi, fn) => update((d) => fn(d.pages[d.current].panels[pi]));

  /* ---------- page controls ---------- */
  const flip = (dir) => {
    update((d) => { d.current = Math.max(0, Math.min(d.pages.length - 1, d.current + dir)); });
    setSel({ panel: 0, obj: null, bubble: null });
  };
  const addPage = () => {
    update((d) => {
      const n = d.pages[d.current].panels.length;
      d.pages.splice(d.current + 1, 0, { panels: Array.from({ length: n }, BLANK_PANEL) });
      d.current += 1;
    });
    setSel({ panel: 0, obj: null, bubble: null });
    flash('New page! 📄');
  };
  const removePage = () => {
    if (data.pages.length <= 1) return;
    update((d) => { d.pages.splice(d.current, 1); d.current = Math.max(0, d.current - 1); });
    setSel({ panel: 0, obj: null, bubble: null });
  };
  const setPanelCount = (n) => {
    n = Math.max(1, Math.min(9, n | 0)) || 4;
    update((d) => {
      const panels = d.pages[d.current].panels;
      while (panels.length < n) panels.push(BLANK_PANEL());
      panels.length = n;
    });
    setSel({ panel: 0, obj: null, bubble: null });
  };

  /* ---------- placing things ---------- */
  const dropItem = (item) => {
    const pi = sel.panel;
    if (item.tag === 'backdrop') {
      updatePanel(pi, (p) => { p.bgUrl = item.dataUrl; });
      flash('Backdrop set! 🏞️');
      return;
    }
    const id = nid();
    updatePanel(pi, (p) => {
      p.objs.push({ id, src: item.dataUrl, x: 26, y: 26, w: item.tag === 'effect' ? 38 : 48, flip: false, fx: item.tag === 'effect' });
    });
    setSel((s) => ({ ...s, obj: id, bubble: null }));
  };

  const addBubble = (text = 'Hello!') => {
    const id = nid();
    updatePanel(sel.panel, (p) => { p.bubbles.push({ id, text, x: 8, y: 8 }); });
    setSel((s) => ({ ...s, bubble: id, obj: null }));
  };

  const setFill = (f) => {
    updatePanel(sel.panel, (p) => { p.fill = f === 'clear' ? null : f; });
    if (f !== 'clear') flash('Backdrop coloured! Draw your own details on top ✏️');
  };

  /* ---------- selected object ops ---------- */
  const withSelObj = (fn) => {
    if (!sel.obj) { flash('Tap one of your drawings first!'); return; }
    updatePanel(sel.panel, (p) => {
      const o = p.objs.find((o) => o.id === sel.obj);
      if (o) fn(o, p);
    });
  };
  const removeSel = () => {
    updatePanel(sel.panel, (p) => {
      if (sel.obj) p.objs = p.objs.filter((o) => o.id !== sel.obj);
      if (sel.bubble) p.bubbles = p.bubbles.filter((b) => b.id !== sel.bubble);
      if (sel.panel != null && !sel.obj && !sel.bubble) p.caption = null;
    });
    setSel((s) => ({ ...s, obj: null, bubble: null }));
  };
  const scatter = () => {
    if (!sel.obj) { flash('Tap one of your drawings first!'); return; }
    updatePanel(sel.panel, (p) => {
      const src = p.objs.find((o) => o.id === sel.obj);
      if (!src) return;
      [[12, 15], [62, 12], [38, 40], [78, 55], [20, 68], [55, 75]].forEach(([x, y]) => {
        p.objs.push({ id: nid(), src: src.src, x, y, w: Math.max(12, src.w * (0.5 + Math.random() * 0.5)), flip: Math.random() > 0.5, fx: src.fx });
      });
    });
    flash('Scattered! ✨');
  };

  /* ---------- dragging (pointer events on the page) ---------- */
  const startDrag = (e, pi, type, id) => {
    e.stopPropagation();
    setSel({ panel: pi, obj: type === 'obj' ? id : null, bubble: type === 'bubble' ? id : null });
    const panelEl = e.currentTarget.closest('.cpanel');
    const r = panelEl.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    const target = e.currentTarget.getBoundingClientRect();
    drag.current = { pi, type, id, r, ox: t.clientX - target.left, oy: t.clientY - target.top };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const t = e.touches ? e.touches[0] : e;
    const { pi, type, id, r, ox, oy } = drag.current;
    const x = Math.max(-15, Math.min(92, ((t.clientX - r.left - ox) / r.width) * 100));
    const y = Math.max(-10, Math.min(90, ((t.clientY - r.top - oy) / r.height) * 100));
    updatePanel(pi, (p) => {
      const arr = type === 'obj' ? p.objs : p.bubbles;
      const o = arr.find((o) => o.id === id);
      if (o) { o.x = x; o.y = y; }
    });
  };
  const endDrag = () => { drag.current = null; };

  /* ---------- story plan → embed captions & a bubble ---------- */
  const applyPlan = ({ title, panels }) => {
    const n = Math.max(1, Math.min(9, panels.length));
    update((d) => {
      const pg = d.pages[d.current];
      while (pg.panels.length < n) pg.panels.push(BLANK_PANEL());
      pg.panels.length = n;
      panels.forEach((text, i) => { pg.panels[i].caption = text; });
    });
    setSel({ panel: 0, obj: null, bubble: null });
    flash(`“${title}” is in your comic! Draw each panel ✏️`);
  };

  /* ---------- export the current page as PNG ---------- */
  const exportPage = async () => {
    const S = 1400, GAP = 26, PAD = 40;
    const rows = Math.ceil(page.panels.length / cols);
    const pw = (S - PAD * 2 - GAP * (cols - 1)) / cols;
    const H = PAD * 2 + rows * pw + (rows - 1) * GAP;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#faf6ee'; c.fillRect(0, 0, S, H);

    const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

    for (let i = 0; i < page.panels.length; i++) {
      const p = page.panels[i];
      const col = i % cols, row = Math.floor(i / cols);
      const x = PAD + col * (pw + GAP), y = PAD + row * (pw + GAP);
      c.save();
      c.beginPath(); c.rect(x, y, pw, pw); c.clip();
      // fill
      if (p.fill) {
        const g = c.createLinearGradient(x, y, x, y + pw);
        const stops = { sky: ['#8fd8ff', '#e8f7ff'], grass: ['#bdeaff', '#7ed957'], sunset: ['#ff9e5e', '#ffe9a8'], night: ['#1b1f4a', '#3b2f6b'], space: ['#2a2a5a', '#0d0d24'], sea: ['#2f9fd6', '#0b5f8a'] }[p.fill] || ['#fff', '#fff'];
        g.addColorStop(0, stops[0]); g.addColorStop(1, stops[1]);
        c.fillStyle = g; c.fillRect(x, y, pw, pw);
      } else { c.fillStyle = '#fff'; c.fillRect(x, y, pw, pw); }
      // drawn backdrop
      if (p.bgUrl) { const im = await loadImg(p.bgUrl); if (im) c.drawImage(im, x, y, pw, pw); }
      // objects
      for (const o of p.objs) {
        const im = await loadImg(o.src);
        if (!im) continue;
        const w = (o.w / 100) * pw;
        const h = w * (im.height / im.width);
        const ox = x + (o.x / 100) * pw, oy = y + (o.y / 100) * pw;
        c.save();
        c.shadowColor = 'rgba(26,27,46,.3)'; c.shadowBlur = 10; c.shadowOffsetY = 6;
        if (o.flip) { c.translate(ox + w, oy); c.scale(-1, 1); c.drawImage(im, 0, 0, w, h); }
        else c.drawImage(im, ox, oy, w, h);
        c.restore();
      }
      // caption
      if (p.caption) {
        c.fillStyle = '#fff3c9'; c.fillRect(x, y, pw, 44);
        c.strokeStyle = '#1a1b2e'; c.lineWidth = 3; c.strokeRect(x, y, pw, 44);
        c.fillStyle = '#1a1b2e'; c.font = "700 21px 'Baloo 2', sans-serif";
        c.fillText(p.caption.slice(0, 60), x + 12, y + 29, pw - 24);
      }
      // bubbles
      c.font = "700 22px 'Baloo 2', sans-serif";
      for (const b of p.bubbles) {
        const bx = x + (b.x / 100) * pw, by = y + (b.y / 100) * pw + (p.caption ? 44 : 0);
        const tw = Math.min(c.measureText(b.text).width + 28, pw * 0.85);
        c.fillStyle = '#fff'; c.strokeStyle = '#1a1b2e'; c.lineWidth = 3;
        roundRect(c, bx, by, tw, 42, 14); c.fill(); c.stroke();
        c.fillStyle = '#1a1b2e'; c.fillText(b.text, bx + 14, by + 28, tw - 24);
      }
      c.restore();
      // panel border
      c.strokeStyle = '#1a1b2e'; c.lineWidth = 5;
      c.strokeRect(x, y, pw, pw);
    }
    const a = document.createElement('a');
    a.download = `my-comic-page-${data.current + 1}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
    flash('Comic page downloaded! 🎉');
  };

  const charLabel = (it) => (it.tag === 'character' && it.role ? it.role : it.tag);

  return (
    <div className="comicwrap" onMouseMove={onMove} onMouseUp={endDrag} onTouchMove={onMove} onTouchEnd={endDrag}>
      <div className="main">
        <div className="pagebar">
          <div className="row">
            <button className="btn sm" onClick={() => flip(-1)} disabled={data.current === 0}>‹</button>
            <span className="plabel">Page {data.current + 1} of {data.pages.length}</span>
            <button className="btn sm" onClick={() => flip(1)} disabled={data.current === data.pages.length - 1}>›</button>
          </div>
          <div className="row">
            <button className="btn sm green" onClick={addPage}>➕ Page</button>
            <button className="btn sm red" onClick={removePage} disabled={data.pages.length <= 1}>🗑️ Page</button>
            <span className="pcfg">
              Panels:
              <input
                type="number" min={1} max={9}
                value={page.panels.length}
                onChange={(e) => setPanelCount(parseInt(e.target.value))}
              />
            </span>
            <button className="btn sm blue" onClick={exportPage}>⬇️ Save as picture</button>
          </div>
        </div>

        <div ref={pageRef} className="cpage" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {page.panels.map((p, pi) => (
            <div
              key={pi}
              className={`cpanel ${sel.panel === pi ? 'selected' : ''}`}
              onMouseDown={(e) => { if (e.target === e.currentTarget) setSel({ panel: pi, obj: null, bubble: null }); }}
              onTouchStart={(e) => { if (e.target === e.currentTarget) setSel({ panel: pi, obj: null, bubble: null }); }}
            >
              {p.fill && <div className="pfill" style={{ background: FILLS[p.fill] }} />}
              {p.bgUrl && <img className="pbg" src={p.bgUrl} alt="" draggable={false} />}
              {p.caption != null && (
                <div
                  className="pcaption"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updatePanel(pi, (pp) => { pp.caption = e.target.textContent; })}
                >
                  {p.caption}
                </div>
              )}
              {p.objs.map((o) => (
                <div
                  key={o.id}
                  className={`pobj ${o.fx ? 'fx' : ''} ${sel.obj === o.id ? 'sel' : ''}`}
                  style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.w}%` }}
                  onMouseDown={(e) => startDrag(e, pi, 'obj', o.id)}
                  onTouchStart={(e) => startDrag(e, pi, 'obj', o.id)}
                >
                  <img src={o.src} alt="" draggable={false} style={{ transform: o.flip ? 'scaleX(-1)' : 'none' }} />
                </div>
              ))}
              {p.bubbles.map((b) => (
                <div
                  key={b.id}
                  className={`pbubble ${sel.bubble === b.id ? 'sel' : ''}`}
                  style={{ left: `${b.x}%`, top: `${b.y}%` }}
                  onMouseDown={(e) => { if (document.activeElement !== e.currentTarget) startDrag(e, pi, 'bubble', b.id); }}
                  onTouchStart={(e) => { if (document.activeElement !== e.currentTarget) startDrag(e, pi, 'bubble', b.id); }}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updatePanel(pi, (pp) => { const bb = pp.bubbles.find((x) => x.id === b.id); if (bb) bb.text = e.target.textContent; })}
                >
                  {b.text}
                </div>
              ))}
              {!p.fill && !p.bgUrl && !p.objs.length && !p.bubbles.length && p.caption == null && (
                <div className="ph">{pi === 0 ? 'Tap something on the right to add it here' : `Panel ${pi + 1}`}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="stack side">
        <div className="panelcard">
          <h3>Your Toy Box</h3>
          {items.length === 0 ? (
            <div className="hint">Nothing yet — draw some things first! <button className="btn sm yellow" onClick={goDraw}>✏️ Go draw</button></div>
          ) : (
            <div className="pick">
              {items.map((it) => (
                <button key={it.id} className="mini" title={it.name} onClick={() => dropItem(it)}>
                  <img src={it.dataUrl} alt={it.name} />
                  <span>{charLabel(it)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm blue" onClick={scatter}>✨ Scatter selected</button>
          </div>
        </div>

        <div className="panelcard">
          <h3>Backdrop colour</h3>
          <div className="row">
            {['sky', 'grass', 'sunset', 'night', 'space', 'sea', 'clear'].map((f) => (
              <button key={f} className="chip" onClick={() => setFill(f)}>
                {{ sky: '☀️ Sky', grass: '🌱 Grass', sunset: '🌅 Sunset', night: '🌙 Night', space: '🚀 Space', sea: '🌊 Sea', clear: 'Ø Clear' }[f]}
              </button>
            ))}
          </div>
          <div className="hint">One tap colours the panel — then draw your own sun, clouds and trees on top!</div>
        </div>

        <div className="panelcard">
          <h3>Selected thing</h3>
          <div className="row">
            <button className="btn sm" onClick={() => withSelObj((o) => { o.flip = !o.flip; })}>🔁 Flip</button>
            <button className="btn sm" onClick={() => withSelObj((o) => { o.w = Math.min(120, o.w * 1.18); })}>➕ Bigger</button>
            <button className="btn sm" onClick={() => withSelObj((o) => { o.w = Math.max(10, o.w * 0.85); })}>➖ Smaller</button>
            <button className="btn sm blue" onClick={() => withSelObj((o, p) => { p.objs.push({ ...o, id: nid(), x: o.x + 8, y: o.y + 8 }); })}>👯 Duplicate</button>
            <button className="btn sm red" onClick={removeSel}>✖ Remove</button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm purple" onClick={() => addBubble()}>💬 Speech bubble</button>
            <button className="btn sm yellow" onClick={() => updatePanel(sel.panel, (p) => { if (p.caption == null) p.caption = 'Meanwhile…'; })}>📜 Caption</button>
          </div>
          <div className="hint">Tap a thing to select it, then drag to move. Tap words to edit them.</div>
        </div>

        <StoryHelper items={items} applyPlan={applyPlan} addBubble={addBubble} goDraw={goDraw} flash={flash} />
      </div>

      <style jsx>{`
        .comicwrap { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-start; }
        .main { flex: 0 1 auto; width: min(620px, 100%); }
        .pagebar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .plabel { font-family: var(--font-display); font-size: 16px; letter-spacing: 1px; min-width: 100px; text-align: center; }
        .pcfg { font-weight: 800; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
        .pcfg input {
          width: 52px; font-family: var(--font-body); font-weight: 800; font-size: 15px;
          padding: 5px; border: 2px solid var(--ink); border-radius: 8px; text-align: center; background: #fff;
        }
        .cpage {
          background: #fff; border: var(--line-bold); border-radius: 12px;
          box-shadow: var(--shadow-panel); padding: 14px;
          display: grid; gap: 12px;
          background-image: radial-gradient(rgba(26,27,46,.05) 1px, transparent 1px);
          background-size: 16px 16px;
        }
        .cpanel {
          position: relative; aspect-ratio: 1; border: 3px solid var(--ink);
          border-radius: 6px; overflow: hidden; background: #fff;
        }
        .cpanel.selected { outline: 4px solid var(--yellow); outline-offset: 2px; }
        .pfill, .pbg { position: absolute; inset: 0; z-index: 0; }
        .pbg { width: 100%; height: 100%; object-fit: cover; }
        .ph {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          color: #a9a695; font-weight: 800; font-size: 13px; text-align: center; padding: 10px; pointer-events: none;
        }
        .pcaption {
          position: absolute; top: 0; left: 0; right: 0; z-index: 5;
          background: var(--yellow-soft); border-bottom: 2.5px solid var(--ink);
          font-weight: 700; font-size: 11.5px; line-height: 1.3; padding: 5px 8px;
          cursor: text;
        }
        .pcaption:focus { outline: 2px solid var(--yellow); }
        .pobj { position: absolute; z-index: 2; cursor: grab; touch-action: none; }
        .pobj.fx { z-index: 3; }
        .pobj.sel { outline: 2px dashed var(--purple); outline-offset: 3px; }
        .pobj img {
          width: 100%; display: block; pointer-events: none;
          filter: drop-shadow(0 6px 8px rgba(26,27,46,.22)) drop-shadow(0 1px 2px rgba(26,27,46,.18));
        }
        .pobj::after {
          content: ""; position: absolute; left: 12%; right: 12%; bottom: -4%; height: 10%;
          background: radial-gradient(ellipse at center, rgba(26,27,46,.26), transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .pobj.fx::after { display: none; }
        .pbubble {
          position: absolute; z-index: 4; max-width: 82%;
          background: #fff; border: 2.5px solid var(--ink); border-radius: 14px;
          padding: 5px 10px; font-weight: 700; font-size: 12.5px;
          cursor: grab; touch-action: none;
        }
        .pbubble::after {
          content: ""; position: absolute; bottom: -11px; left: 16px;
          border: 8px solid transparent; border-top-color: var(--ink);
        }
        .pbubble.sel, .pbubble:focus { outline: 2px dashed var(--purple); outline-offset: 2px; }
        .side { width: 310px; max-width: 100%; }
        .pick { display: flex; flex-wrap: wrap; gap: 7px; }
        .mini {
          position: relative; width: 56px; height: 56px; padding: 0;
          border: 2px solid var(--ink); border-radius: 8px; background: #fff;
          cursor: pointer; overflow: hidden; box-shadow: var(--shadow-soft);
        }
        .mini:active { transform: translate(2px,2px); box-shadow: none; }
        .mini img { width: 100%; height: 100%; object-fit: contain; }
        .mini span {
          position: absolute; bottom: 0; left: 0; right: 0; font-size: 8px; font-weight: 800;
          text-align: center; color: #fff; background: rgba(26,27,46,.75);
        }
      `}</style>
    </div>
  );
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
