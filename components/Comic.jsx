'use client';

import { useRef, useState, useCallback } from 'react';
import StoryHelper from '@/components/StoryHelper';

/*
 Comic data model:
 comic = { pages: [ { layout, panels: [ { fill, ground, bgUrl, caption,
   objs: [ {id,src,x,y,w,flip,fx} ], bubbles: [ {id,text,x,y,kind} ] } ] } ], current }
 Panel geometry comes from LAYOUTS — a portrait comic page with % rects,
 so panels can be wide, tall, or square like a real comic.
*/

const BLANK_PANEL = () => ({ fill: null, ground: null, bgUrl: null, caption: null, objs: [], bubbles: [] });

// % rects on a portrait page (aspect 3:4), 2% gutters.
const LAYOUTS = {
  splash1: { name: 'Splash', n: 1, rects: [[2, 2, 96, 96]] },
  duo2: { name: 'Two tall', n: 2, rects: [[2, 2, 47, 96], [51, 2, 47, 96]] },
  hero3: { name: 'Hero 3', n: 3, rects: [[2, 2, 96, 47], [2, 51, 47, 47], [51, 51, 47, 47]] },
  classic4: { name: 'Classic 4', n: 4, rects: [[2, 2, 47, 47], [51, 2, 47, 47], [2, 51, 47, 47], [51, 51, 47, 47]] },
  action5: { name: 'Action 5', n: 5, rects: [[2, 2, 96, 30], [2, 34, 31, 30], [34.5, 34, 31, 30], [67, 34, 31, 30], [2, 66, 96, 32]] },
  grid6: { name: 'Six', n: 6, rects: [[2, 2, 47, 30.6], [51, 2, 47, 30.6], [2, 34.7, 47, 30.6], [51, 34.7, 47, 30.6], [2, 67.4, 47, 30.6], [51, 67.4, 47, 30.6]] },
  mega9: { name: 'Mega 9', n: 9, rects: [[2, 2, 31, 30.6], [34.5, 2, 31, 30.6], [67, 2, 31, 30.6], [2, 34.7, 31, 30.6], [34.5, 34.7, 31, 30.6], [67, 34.7, 31, 30.6], [2, 67.4, 31, 30.6], [34.5, 67.4, 31, 30.6], [67, 67.4, 31, 30.6]] },
};
const LAYOUT_ORDER = ['splash1', 'duo2', 'hero3', 'classic4', 'action5', 'grid6', 'mega9'];
const pickLayout = (n) => (n <= 1 ? 'splash1' : n === 2 ? 'duo2' : n === 3 ? 'hero3' : n === 4 ? 'classic4' : n === 5 ? 'action5' : n <= 6 ? 'grid6' : 'mega9');

const blankComic = () => ({ pages: [{ layout: 'classic4', panels: Array.from({ length: 4 }, BLANK_PANEL) }], current: 0 });

const FILLS = {
  sky: 'radial-gradient(circle at 75% 20%, rgba(255,244,200,.55), transparent 45%), linear-gradient(#8fd8ff,#e8f7ff)',
  grass: 'radial-gradient(circle at 78% 16%, rgba(255,244,200,.5), transparent 40%), linear-gradient(#bdeaff 55%,#7ed957 55%)',
  sunset: 'linear-gradient(#ff9e5e 0%,#ff9e5e 22%,#ffb45e 22%,#ffb45e 45%,#ffd76b 45%,#ffd76b 70%,#ffe9a8 70%)',
  night: 'radial-gradient(circle at 50% 45%, rgba(0,0,10,0) 40%, rgba(0,0,10,.38) 100%), linear-gradient(#1b1f4a,#3b2f6b)',
  space: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.4) 100%), radial-gradient(circle at 30% 30%,#2a2a5a,#0d0d24)',
  sea: 'repeating-linear-gradient(105deg, rgba(255,255,255,.10) 0 10px, transparent 10px 44px), linear-gradient(#2f9fd6,#0b5f8a)',
};

let uid = 1;
const nid = () => `${Date.now()}-${uid++}`;

export default function Comic({ items, comic, setComic, flash, goDraw, stories, addStory, removeStory }) {
  const data = comic || blankComic();
  const [sel, setSel] = useState({ panel: 0, obj: null, bubble: null });
  const drag = useRef(null);

  const page = data.pages[data.current];
  const layoutId = page.layout || pickLayout(page.panels.length);
  const layout = LAYOUTS[layoutId] || LAYOUTS.classic4;

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
      const cur = d.pages[d.current];
      const lid = cur.layout || pickLayout(cur.panels.length);
      d.pages.splice(d.current + 1, 0, { layout: lid, panels: Array.from({ length: LAYOUTS[lid].n }, BLANK_PANEL) });
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
  const setLayout = (lid) => {
    update((d) => {
      const pg = d.pages[d.current];
      pg.layout = lid;
      const n = LAYOUTS[lid].n;
      while (pg.panels.length < n) pg.panels.push(BLANK_PANEL());
      pg.panels.length = n;
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
      p.objs.push({
        id, src: item.dataUrl,
        x: 18 + Math.random() * 24, y: 18 + Math.random() * 24,
        w: item.tag === 'effect' ? 38 : 48, flip: false, fx: item.tag === 'effect',
      });
    });
    setSel((s) => ({ ...s, obj: id, bubble: null }));
  };

  const addBubble = (text = 'Hello!', kind = 'say') => {
    const id = nid();
    updatePanel(sel.panel, (p) => { p.bubbles.push({ id, text, x: 8, y: 6, kind }); });
    setSel((s) => ({ ...s, bubble: id, obj: null }));
  };

  const setFill = (f) => {
    updatePanel(sel.panel, (p) => { p.fill = f === 'clear' ? null : f; });
    if (f !== 'clear') flash('Backdrop coloured! ✏️');
  };
  const setGround = (g) => {
    updatePanel(sel.panel, (p) => { p.ground = g === 'none' ? null : g; });
    if (g !== 'none') flash('Ground in! ✨');
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

  /* ---------- dragging ---------- */
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

  /* ---------- story plan → speech bubbles, sfx, cast, scenes ---------- */
  const applyPlan = ({ title, panels }) => {
    // Normalise: beats may be old strings or new {caption, dialogue, sfx}.
    const beats = panels.slice(0, 9).map((b) =>
      typeof b === 'string'
        ? { caption: b, dialogue: [], sfx: null }
        : { caption: b.caption || null, dialogue: Array.isArray(b.dialogue) ? b.dialogue.slice(0, 3) : [], sfx: b.sfx || null }
    );
    const lid = pickLayout(beats.length);
    const n = LAYOUTS[lid].n;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = (nm) => new RegExp('(?<!\\w)' + esc(nm) + '(?!\\w)', 'i');
    const fillFor = (text, i) => {
      const t = text.toLowerCase();
      if (/space|planet|rocket|moon|galaxy/.test(t)) return 'space';
      if (/night|dark|midnight|sleep/.test(t)) return 'night';
      if (/sea|ocean|underwater|beach|swim|water/.test(t)) return 'sea';
      if (/sunset|evening/.test(t)) return 'sunset';
      if (/sky|fly|flying|cloud/.test(t)) return 'sky';
      return ['grass', 'sky', 'grass', 'sunset'][i % 4];
    };
    const groundFor = { sky: 'hill', sunset: 'hill', night: 'hill', sea: 'sand', space: null, grass: null };

    update((d) => {
      let pg = d.pages[d.current];
      const pageEmpty = pg.panels.every((p) => !p.objs.length && !p.bubbles.length && p.caption == null && !p.bgUrl && !p.fill);
      if (!pageEmpty) {
        // never overwrite or double-stack existing work — build on a fresh page
        pg = { layout: lid, panels: [] };
        d.pages.splice(d.current + 1, 0, pg);
        d.current += 1;
      }
      pg.layout = lid;
      pg.panels = Array.from({ length: n }, BLANK_PANEL);
      beats.forEach((beat, i) => {
        const p = pg.panels[i];
        const allText = [beat.caption, beat.sfx, ...beat.dialogue.map((dl) => `${dl.who} ${dl.says}`)].filter(Boolean).join(' ');
        p.caption = beat.caption;
        // place the named cast
        const cast = items.filter((it) => it.name.trim().length >= 2 && nameRe(it.name.trim()).test(allText));
        const side = {}; // speaker name -> left/right
        let chars = 0, placed = 0;
        for (const it of cast) {
          if (placed >= 4) break;
          if (it.tag === 'backdrop') { if (!p.bgUrl) p.bgUrl = it.dataUrl; continue; }
          if (it.tag === 'character') {
            const left = chars % 2 === 0;
            side[it.name.toLowerCase()] = left ? 'left' : 'right';
            p.objs.push({ id: nid(), src: it.dataUrl, x: left ? 6 + chars * 3 : 52, y: 38 + chars * 3, w: 44, flip: !left, fx: false });
            chars++; placed++;
          } else if (it.tag === 'prop') {
            p.objs.push({ id: nid(), src: it.dataUrl, x: 40, y: 58, w: 26, flip: false, fx: false });
            placed++;
          } else {
            p.objs.push({ id: nid(), src: it.dataUrl, x: 34, y: 4, w: 32, flip: false, fx: true });
            placed++;
          }
        }
        // dialogue → speech bubbles near their speaker
        beat.dialogue.forEach((dl, di) => {
          const s = side[(dl.who || '').toLowerCase()];
          const x = s === 'right' ? 42 : 4;
          p.bubbles.push({ id: nid(), text: dl.says, x: x + di * 3, y: 3 + di * 15, kind: 'say' });
        });
        // sfx → big action lettering
        if (beat.sfx) p.bubbles.push({ id: nid(), text: beat.sfx, x: 28, y: 34, kind: 'sfx' });
        // auto-scene
        if (!p.bgUrl && !p.fill) {
          p.fill = fillFor(allText, i);
          if (p.ground == null) p.ground = groundFor[p.fill] ?? null;
        }
      });
    });
    setSel({ panel: 0, obj: null, bubble: null });
    flash(`“${title}” — speech bubbles and all! Arrange and make it yours ✏️`);
  };

  /* ---------- export the current page as PNG ---------- */
  const exportPage = async () => {
    const W = 1400, H = Math.round((W * 4) / 3), PAD = 0;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#faf6ee'; c.fillRect(0, 0, W, H);

    const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

    for (let i = 0; i < page.panels.length && i < layout.rects.length; i++) {
      const p = page.panels[i];
      const [rx, ry, rw, rh] = layout.rects[i];
      const x = (rx / 100) * W, y = (ry / 100) * H;
      const pw = (rw / 100) * W, ph = (rh / 100) * H;
      c.save();
      c.beginPath(); c.rect(x, y, pw, ph); c.clip();
      paintFill(c, x, y, pw, ph, p.fill);
      if (p.bgUrl) { const im = await loadImg(p.bgUrl); if (im) c.drawImage(im, x, y, pw, ph); }
      paintGround(c, x, y, pw, ph, p.ground);
      for (const o of p.objs) {
        const im = await loadImg(o.src);
        if (!im) continue;
        const w = (o.w / 100) * pw;
        const h = w * (im.height / im.width);
        const ox = x + (o.x / 100) * pw, oy = y + (o.y / 100) * ph;
        c.save();
        c.shadowColor = 'rgba(26,27,46,.3)'; c.shadowBlur = 10; c.shadowOffsetY = 6;
        if (o.flip) { c.translate(ox + w, oy); c.scale(-1, 1); c.drawImage(im, 0, 0, w, h); }
        else c.drawImage(im, ox, oy, w, h);
        c.restore();
      }
      if (p.caption) {
        const ch = Math.max(30, ph * 0.12);
        c.fillStyle = '#fff3c9'; c.fillRect(x, y, pw, ch);
        c.strokeStyle = '#1a1b2e'; c.lineWidth = 3; c.strokeRect(x, y, pw, ch);
        c.fillStyle = '#1a1b2e'; c.font = `700 ${Math.round(ch * 0.5)}px 'Baloo 2', sans-serif`;
        c.fillText(p.caption.slice(0, 70), x + 12, y + ch * 0.68, pw - 24);
      }
      for (const b of p.bubbles) {
        drawBubble(c, b, x + (b.x / 100) * pw, y + (b.y / 100) * ph, pw);
      }
      c.restore();
      c.strokeStyle = '#1a1b2e'; c.lineWidth = 6;
      c.strokeRect(x, y, pw, ph);
    }
    const a = document.createElement('a');
    a.download = `oscars-comic-page-${data.current + 1}.png`;
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
            <button className="btn sm green" onClick={addPage}>➕ Page</button>
            <button className="btn sm red" onClick={removePage} disabled={data.pages.length <= 1}>🗑️</button>
            <button className="btn sm blue" onClick={exportPage}>⬇️ Save as picture</button>
          </div>
          <div className="row layouts">
            {LAYOUT_ORDER.map((lid) => (
              <button
                key={lid}
                className={`laybtn ${layoutId === lid ? 'on' : ''}`}
                title={LAYOUTS[lid].name}
                onClick={() => setLayout(lid)}
              >
                <span className="laythumb">
                  {LAYOUTS[lid].rects.map((r, i) => (
                    <i key={i} style={{ left: `${r[0]}%`, top: `${r[1]}%`, width: `${r[2]}%`, height: `${r[3]}%` }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="cpage">
          {page.panels.slice(0, layout.rects.length).map((p, pi) => {
            const [rx, ry, rw, rh] = layout.rects[pi];
            return (
              <div
                key={pi}
                className={`cpanel ${sel.panel === pi ? 'selected' : ''}`}
                style={{ left: `${rx}%`, top: `${ry}%`, width: `${rw}%`, height: `${rh}%` }}
                onMouseDown={(e) => { if (e.target === e.currentTarget) setSel({ panel: pi, obj: null, bubble: null }); }}
                onTouchStart={(e) => { if (e.target === e.currentTarget) setSel({ panel: pi, obj: null, bubble: null }); }}
              >
                {p.fill && <div className="pfill" style={{ background: FILLS[p.fill] }} />}
                {p.bgUrl && <img className="pbg" src={p.bgUrl} alt="" draggable={false} />}
                {p.ground && <div className={`pground g-${p.ground}`} />}
                {p.caption != null && (
                  <div
                    className="pcaption"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const t = e.target.textContent.trim();
                      updatePanel(pi, (pp) => { pp.caption = t ? t : null; });
                    }}
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
                    className={`pbubble k-${b.kind || 'say'} ${sel.bubble === b.id ? 'sel' : ''}`}
                    style={{ left: `${b.x}%`, top: `${b.y}%` }}
                    onMouseDown={(e) => { if (document.activeElement !== e.currentTarget) startDrag(e, pi, 'bubble', b.id); }}
                    onTouchStart={(e) => { if (document.activeElement !== e.currentTarget) startDrag(e, pi, 'bubble', b.id); }}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const t = e.target.textContent.trim();
                      updatePanel(pi, (pp) => {
                        if (!t) pp.bubbles = pp.bubbles.filter((x) => x.id !== b.id);
                        else { const bb = pp.bubbles.find((x) => x.id === b.id); if (bb) bb.text = t; }
                      });
                    }}
                  >
                    {b.text}
                  </div>
                ))}
                {!p.fill && !p.bgUrl && !p.objs.length && !p.bubbles.length && p.caption == null && (
                  <div className="ph">{pi === 0 ? 'Tap things on the right to fill this panel' : `Panel ${pi + 1}`}</div>
                )}
              </div>
            );
          })}
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
          <div className="hint">Tap LOTS into one panel — heroes can hold weapons, ride vehicles, and face baddies! Use ⬆️ Front / ⬇️ Back to layer them.</div>
        </div>

        <div className="panelcard">
          <h3>Words & lettering</h3>
          <div className="row">
            <button className="btn sm purple" onClick={() => addBubble('Hello!', 'say')}>💬 Say</button>
            <button className="btn sm" onClick={() => addBubble('Hmm…', 'thought')}>💭 Think</button>
            <button className="btn sm red" onClick={() => addBubble('STOP!', 'shout')}>🗯️ Shout</button>
            <button className="btn sm yellow" onClick={() => addBubble('POW!', 'sfx')}>💥 Action word</button>
            <button className="btn sm" onClick={() => updatePanel(sel.panel, (p) => { if (p.caption == null) p.caption = 'Meanwhile…'; })}>📜 Caption</button>
          </div>
          <div className="hint">Comics talk in bubbles! Tap words to edit them; delete all the words to remove one.</div>
        </div>

        <div className="panelcard">
          <h3>Selected thing</h3>
          <div className="row">
            <button className="btn sm" onClick={() => withSelObj((o) => { o.flip = !o.flip; })}>🔁 Flip</button>
            <button className="btn sm" onClick={() => withSelObj((o) => { o.w = Math.min(120, o.w * 1.18); })}>➕ Bigger</button>
            <button className="btn sm" onClick={() => withSelObj((o) => { o.w = Math.max(10, o.w * 0.85); })}>➖ Smaller</button>
            <button className="btn sm" onClick={() => withSelObj((o, p) => { const i = p.objs.indexOf(o); if (i < p.objs.length - 1) { p.objs.splice(i, 1); p.objs.push(o); } })}>⬆️ Front</button>
            <button className="btn sm" onClick={() => withSelObj((o, p) => { const i = p.objs.indexOf(o); if (i > 0) { p.objs.splice(i, 1); p.objs.unshift(o); } })}>⬇️ Back</button>
            <button className="btn sm blue" onClick={() => withSelObj((o, p) => { p.objs.push({ ...o, id: nid(), x: o.x + 8, y: o.y + 8 }); })}>👯 Duplicate</button>
            <button className="btn sm red" onClick={removeSel}>✖ Remove</button>
          </div>
          <div className="hint">Tap a thing to select it, then drag to move.</div>
        </div>

        <div className="panelcard">
          <h3>Backdrop colour & ground</h3>
          <div className="row">
            {['sky', 'grass', 'sunset', 'night', 'space', 'sea', 'clear'].map((f) => (
              <button key={f} className="chip" onClick={() => setFill(f)}>
                {{ sky: '☀️ Sky', grass: '🌱 Grass', sunset: '🌅 Sunset', night: '🌙 Night', space: '🚀 Space', sea: '🌊 Sea', clear: 'Ø Clear' }[f]}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {['hill', 'floor', 'sand', 'none'].map((g) => (
              <button key={g} className="chip" onClick={() => setGround(g)}>
                {{ hill: '⛰️ Hill', floor: '🟫 Floor', sand: '🏖️ Sand', none: 'Ø No ground' }[g]}
              </button>
            ))}
          </div>
        </div>

        <StoryHelper items={items} applyPlan={applyPlan} addBubble={addBubble} goDraw={goDraw} flash={flash} stories={stories} addStory={addStory} removeStory={removeStory} />
      </div>

      <style jsx>{`
        .comicwrap { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-start; }
        .main { flex: 0 1 auto; width: min(560px, 100%); }
        .pagebar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .plabel { font-family: var(--font-display); font-size: 15px; letter-spacing: 1px; min-width: 92px; text-align: center; }
        .layouts { gap: 6px; }
        .laybtn {
          width: 40px; height: 50px; padding: 2px; cursor: pointer;
          background: #fff; border: 2px solid var(--ink); border-radius: 7px;
          box-shadow: var(--shadow-soft);
        }
        .laybtn.on { outline: 3px solid var(--blue); outline-offset: 1px; }
        .laythumb { position: relative; display: block; width: 100%; height: 100%; }
        .laythumb i { position: absolute; background: var(--ink-soft); border-radius: 1.5px; }
        .laybtn.on .laythumb i { background: var(--blue); }
        .cpage {
          position: relative; aspect-ratio: 3 / 4;
          background: #fff; border: var(--line-bold); border-radius: 12px;
          box-shadow: var(--shadow-panel);
          background-image: radial-gradient(rgba(26,27,46,.05) 1px, transparent 1px);
          background-size: 16px 16px;
        }
        .cpanel {
          position: absolute; border: 3px solid var(--ink);
          border-radius: 5px; overflow: hidden; background: #fff;
        }
        .cpanel.selected { outline: 4px solid var(--yellow); outline-offset: 2px; z-index: 2; }
        .pfill, .pbg { position: absolute; inset: 0; z-index: 0; }
        .pbg { width: 100%; height: 100%; object-fit: cover; }
        .pground { position: absolute; left: -12%; right: -12%; bottom: 0; z-index: 1; pointer-events: none; }
        .g-hill { height: 36%; background: #7ed957; border-radius: 100% 100% 0 0; }
        .g-floor { height: 26%; background: #c9a16b; }
        .g-sand { height: 23%; background: #f0dfa8; border-radius: 60% 40% 0 0 / 28% 22% 0 0; }
        .ph {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          color: #a9a695; font-weight: 800; font-size: 12px; text-align: center; padding: 8px; pointer-events: none;
        }
        .pcaption {
          position: absolute; top: 0; left: 0; right: 0; z-index: 5;
          background: var(--yellow-soft); border-bottom: 2.5px solid var(--ink);
          font-weight: 700; font-size: 11px; line-height: 1.25; padding: 4px 8px;
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
          position: absolute; z-index: 4; max-width: 80%;
          background: #fff; border: 2.5px solid var(--ink); border-radius: 14px;
          padding: 4px 9px; font-weight: 700; font-size: 12px; line-height: 1.25;
          cursor: grab; touch-action: none;
        }
        .pbubble::after {
          content: ""; position: absolute; bottom: -11px; left: 16px;
          border: 8px solid transparent; border-top-color: var(--ink);
        }
        .pbubble.k-thought { border-style: dashed; border-radius: 50%; padding: 8px 12px; }
        .pbubble.k-thought::after {
          border: none; width: 8px; height: 8px; border-radius: 50%;
          background: #fff; box-shadow: 0 0 0 2.5px var(--ink), 10px 8px 0 -2px #fff, 10px 8px 0 -0.5px var(--ink);
          bottom: -12px;
        }
        .pbubble.k-shout {
          border-width: 3.5px; border-color: var(--red);
          font-family: var(--font-display); font-weight: 400; letter-spacing: 1px;
          text-transform: uppercase; font-size: 14px; border-radius: 6px;
        }
        .pbubble.k-shout::after { border-top-color: var(--red); }
        .pbubble.k-sfx {
          background: none; border: none; padding: 0;
          font-family: var(--font-display); font-weight: 400;
          font-size: clamp(20px, 5cqw, 34px); letter-spacing: 1.5px;
          color: var(--red);
          text-shadow: 2.5px 2.5px 0 var(--yellow), -1.5px -1.5px 0 var(--ink), 1.5px -1.5px 0 var(--ink), -1.5px 1.5px 0 var(--ink), 3.5px 3.5px 0 var(--ink);
          transform: rotate(-6deg);
          max-width: 95%;
        }
        .pbubble.k-sfx::after { display: none; }
        .pbubble.sel, .pbubble:focus { outline: 2px dashed var(--purple); outline-offset: 2px; }
        .side { width: 310px; max-width: 100%; }
        .pick { display: flex; flex-wrap: wrap; gap: 7px; }
        .mini {
          position: relative; width: 52px; height: 52px; padding: 0;
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

/* ---------- canvas painters shared with export ---------- */

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawBubble(c, b, bx, by, panelW) {
  const kind = b.kind || 'say';
  if (kind === 'sfx') {
    c.save();
    c.translate(bx, by);
    c.rotate(-0.105);
    const size = Math.max(28, panelW * 0.12);
    c.font = `400 ${size}px Bangers, 'Baloo 2', sans-serif`;
    c.lineWidth = Math.max(3, size * 0.12);
    c.strokeStyle = '#1a1b2e';
    c.strokeText(b.text, 0, size);
    c.fillStyle = '#e8442e';
    c.fillText(b.text, 0, size);
    c.restore();
    return;
  }
  const isShout = kind === 'shout';
  const font = isShout
    ? `400 ${Math.max(18, panelW * 0.045)}px Bangers, 'Baloo 2', sans-serif`
    : `700 ${Math.max(17, panelW * 0.04)}px 'Baloo 2', sans-serif`;
  c.font = font;
  const text = isShout ? b.text.toUpperCase() : b.text;
  const tw = Math.min(c.measureText(text).width + 28, panelW * 0.8);
  const th = Math.max(34, panelW * 0.075);
  c.save();
  if (kind === 'thought') c.setLineDash([7, 6]);
  c.fillStyle = '#fff';
  c.strokeStyle = isShout ? '#e8442e' : '#1a1b2e';
  c.lineWidth = isShout ? 5 : 3.5;
  roundRect(c, bx, by, tw, th, kind === 'thought' ? th / 2 : 12);
  c.fill(); c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#1a1b2e';
  c.fillText(text, bx + 14, by + th * 0.66, tw - 24);
  c.restore();
}

function paintFill(c, x, y, pw, ph, fill) {
  const lin = (stops) => {
    const g = c.createLinearGradient(x, y, x, y + ph);
    for (const [o, col] of stops) g.addColorStop(o, col);
    return g;
  };
  const glow = (gx, gy, r, col) => {
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x, y, pw, ph);
  };
  if (!fill) { c.fillStyle = '#fff'; c.fillRect(x, y, pw, ph); return; }
  if (fill === 'sky') {
    c.fillStyle = lin([[0, '#8fd8ff'], [1, '#e8f7ff']]); c.fillRect(x, y, pw, ph);
    glow(x + pw * 0.75, y + ph * 0.2, Math.max(pw, ph) * 0.42, 'rgba(255,244,200,.55)');
  } else if (fill === 'grass') {
    c.fillStyle = lin([[0, '#bdeaff'], [0.55, '#bdeaff'], [0.55, '#7ed957'], [1, '#7ed957']]); c.fillRect(x, y, pw, ph);
    glow(x + pw * 0.78, y + ph * 0.16, Math.max(pw, ph) * 0.36, 'rgba(255,244,200,.5)');
  } else if (fill === 'sunset') {
    c.fillStyle = lin([[0, '#ff9e5e'], [0.22, '#ff9e5e'], [0.22, '#ffb45e'], [0.45, '#ffb45e'], [0.45, '#ffd76b'], [0.7, '#ffd76b'], [0.7, '#ffe9a8'], [1, '#ffe9a8']]);
    c.fillRect(x, y, pw, ph);
  } else if (fill === 'night') {
    c.fillStyle = lin([[0, '#1b1f4a'], [1, '#3b2f6b']]); c.fillRect(x, y, pw, ph);
    const v = c.createRadialGradient(x + pw / 2, y + ph * 0.45, Math.min(pw, ph) * 0.35, x + pw / 2, y + ph * 0.45, Math.max(pw, ph) * 0.8);
    v.addColorStop(0, 'rgba(0,0,10,0)'); v.addColorStop(1, 'rgba(0,0,10,.38)');
    c.fillStyle = v; c.fillRect(x, y, pw, ph);
  } else if (fill === 'space') {
    const g = c.createRadialGradient(x + pw * 0.3, y + ph * 0.3, 0, x + pw * 0.3, y + ph * 0.3, Math.max(pw, ph));
    g.addColorStop(0, '#2a2a5a'); g.addColorStop(1, '#0d0d24');
    c.fillStyle = g; c.fillRect(x, y, pw, ph);
  } else if (fill === 'sea') {
    c.fillStyle = lin([[0, '#2f9fd6'], [1, '#0b5f8a']]); c.fillRect(x, y, pw, ph);
    c.save();
    c.globalAlpha = 0.1; c.fillStyle = '#fff';
    c.translate(x + pw / 2, y + ph / 2); c.rotate(0.26); c.translate(-pw / 2, -ph / 2);
    for (let rx = -pw * 0.4; rx < pw * 1.4; rx += pw * 0.22) c.fillRect(rx, -ph * 0.4, pw * 0.055, ph * 1.8);
    c.restore();
  } else {
    c.fillStyle = '#fff'; c.fillRect(x, y, pw, ph);
  }
}

function paintGround(c, x, y, pw, ph, ground) {
  if (!ground) return;
  if (ground === 'hill') {
    c.fillStyle = '#7ed957';
    c.beginPath();
    c.ellipse(x + pw / 2, y + ph * 1.16, pw * 0.82, ph * 0.52, 0, 0, Math.PI * 2);
    c.fill();
  } else if (ground === 'floor') {
    c.fillStyle = '#c9a16b';
    c.fillRect(x, y + ph * 0.74, pw, ph * 0.26);
  } else if (ground === 'sand') {
    c.fillStyle = '#f0dfa8';
    c.fillRect(x, y + ph * 0.79, pw, ph * 0.21);
    c.beginPath();
    c.ellipse(x + pw * 0.45, y + ph * 0.79, pw * 0.62, ph * 0.06, 0, 0, Math.PI * 2);
    c.fill();
  }
}
