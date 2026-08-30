'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PALETTE, SUB_TYPES, SUB_HINTS } from '@/lib/store';
import { cleanupBackground, exportSprite, floodFill } from '@/lib/sprites';
import { COACH, drawGuide } from '@/lib/guides';
import { offlineNames } from '@/lib/offline';

const SIZE = 560; // internal canvas resolution

export default function Studio({ beginner, addItem, flash }) {
  const boardRef = useRef(null);
  const guideRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const mid = useRef(null);
  const undoStack = useRef([]);

  const [color, setColor] = useState('#1A1B2E');
  const [size, setSize] = useState(10);
  const [tool, setTool] = useState('brush'); // brush | eraser | fill
  const [kind, setKind] = useState('character');
  const [subType, setSubType] = useState('person');
  const [guideOn, setGuideOn] = useState(true);
  const [coachStep, setCoachStep] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [pop, setPop] = useState(true);
  const fileRef = useRef(null);

  // init canvas
  useEffect(() => {
    const ctx = boardRef.current.getContext('2d', { willReadFrequently: true });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  // guide layer redraw
  useEffect(() => {
    const g = guideRef.current.getContext('2d');
    if (beginner && guideOn) drawGuide(g, SIZE, SIZE, subType);
    else g.clearRect(0, 0, SIZE, SIZE);
  }, [beginner, guideOn, subType]);

  // reset coach on subtype change
  useEffect(() => { setCoachStep(0); }, [subType, kind]);

  const snapshot = useCallback(() => {
    const ctx = ctxRef.current;
    undoStack.current.push(ctx.getImageData(0, 0, SIZE, SIZE));
    if (undoStack.current.length > 30) undoStack.current.shift();
  }, []);

  const pos = (e) => {
    const r = boardRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: ((t.clientX - r.left) * SIZE) / r.width,
      y: ((t.clientY - r.top) * SIZE) / r.height,
    };
  };

  const start = (e) => {
    e.preventDefault();
    const p = pos(e);
    if (tool === 'fill') {
      snapshot();
      // fill needs an opaque base: composite onto white first? No — fill respects
      // transparency as a colour, which lets kids fill the "outside" too. Keep raw.
      floodFill(ctxRef.current, SIZE, SIZE, p.x, p.y, color);
      return;
    }
    drawing.current = true;
    snapshot();
    last.current = p;
    mid.current = p;
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const p = pos(e);
    // smooth quadratic strokes: draw curve from previous midpoint through last point
    const m = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.strokeStyle = tool === 'eraser' ? '#00000000' : color;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = tool === 'eraser' ? size * 2.4 : size;
    ctx.beginPath();
    ctx.moveTo(mid.current.x, mid.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, m.x, m.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    last.current = p;
    mid.current = m;
  };

  const end = () => { drawing.current = false; };

  const undo = () => {
    if (undoStack.current.length) {
      ctxRef.current.putImageData(undoStack.current.pop(), 0, 0);
    }
  };
  const clear = () => {
    snapshot();
    ctxRef.current.clearRect(0, 0, SIZE, SIZE);
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      snapshot();
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const s = Math.min(SIZE / img.width, SIZE / img.height);
      const w = img.width * s, h = img.height * s;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      cleanupBackground(ctx, SIZE, SIZE);
      flash('Cleaned up! Only your drawing stays ✂️');
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  const openSave = () => {
    const data = exportSprite(ctxRef.current, SIZE, SIZE, { pop });
    if (!data) { flash('Draw something first! ✏️'); return; }
    setPending({ data, name: '', role: 'goodie', names: [] });
    setSaveOpen(true);
  };

  const rePop = (next) => {
    setPop(next);
    const data = exportSprite(ctxRef.current, SIZE, SIZE, { pop: next });
    if (data) setPending((p) => ({ ...p, data }));
  };

  const suggestNames = () => {
    setPending((p) => ({ ...p, names: offlineNames(subType) }));
  };

  const confirmSave = () => {
    const item = {
      id: Date.now(),
      name: pending.name.trim() || 'My Drawing',
      tag: kind,
      subType,
      dataUrl: pending.data,
    };
    if (kind === 'character') item.role = pending.role;
    addItem(item);
    setSaveOpen(false);
    flash('Saved to your Toy Box! 🧸');
  };

  const script = COACH[subType] || COACH.person;

  return (
    <div className="studio">
      <div className="board-wrap">
        <div className="board-stack">
          <canvas
            ref={boardRef}
            width={SIZE}
            height={SIZE}
            className="board"
            data-tool={tool}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
          <canvas ref={guideRef} width={SIZE} height={SIZE} className="guide" />
        </div>
      </div>

      <div className="stack tools">
        <div className="panelcard">
          <h3>What are you drawing?</h3>
          <div className="row">
            {Object.keys(SUB_TYPES).map((k) => (
              <button
                key={k}
                className="chip"
                aria-pressed={kind === k}
                onClick={() => {
                  setKind(k);
                  setSubType(SUB_TYPES[k][0].id);
                }}
              >
                {{ character: '🦸 Character', backdrop: '🏞️ Backdrop', prop: '🚗 Prop', effect: '💥 Effect' }[k]}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            {SUB_TYPES[kind].map((s) => (
              <button
                key={s.id}
                className="chip"
                aria-pressed={subType === s.id}
                onClick={() => setSubType(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="hint">{SUB_HINTS[subType]}</div>
        </div>

        {beginner && (
          <div className="panelcard coach">
            <h3>🌱 Step by step</h3>
            <div className="coach-step">
              <span className="coach-num">Step {Math.min(coachStep + 1, script.length)} of {script.length}</span>
              {coachStep < script.length ? script[coachStep] : '🎉 You did it! Save it to your Toy Box.'}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn sm green" onClick={() => setCoachStep((s) => Math.min(s + 1, script.length))}>
                Next step →
              </button>
              <button className="btn sm" onClick={() => setCoachStep(0)}>↺ Restart</button>
              <button className="btn sm" onClick={() => setGuideOn((g) => !g)}>
                {guideOn ? 'Hide outline' : 'Show outline'}
              </button>
            </div>
            <div className="hint">The faint outline matches your pick — trace it, then make it yours. It never gets saved.</div>
          </div>
        )}

        <div className="panelcard">
          <h3>Colours</h3>
          <div className="swatches">
            {PALETTE.map((c) => (
              <button
                key={c}
                className="sw"
                style={{ background: c }}
                aria-pressed={color === c && tool !== 'eraser'}
                aria-label={c}
                onClick={() => { setColor(c); if (tool === 'eraser') setTool('brush'); }}
              />
            ))}
            <label className="sw rainbow" title="Any colour!">
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); if (tool === 'eraser') setTool('brush'); }}
              />
            </label>
          </div>
        </div>

        <div className="panelcard">
          <h3>Tools</h3>
          <div className="row">
            <button className="chip" aria-pressed={tool === 'brush'} onClick={() => setTool('brush')}>🖌️ Brush</button>
            <button className="chip" aria-pressed={tool === 'fill'} onClick={() => setTool('fill')}>🪣 Fill</button>
            <button className="chip" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>🧽 Eraser</button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            {[6, 10, 16, 26].map((n) => (
              <button
                key={n}
                className="size-dot"
                style={{ width: n + 10, height: n + 10 }}
                aria-pressed={size === n}
                aria-label={`brush size ${n}`}
                onClick={() => setSize(n)}
              />
            ))}
            <span style={{ flex: 1 }} />
            <button className="btn sm" onClick={undo}>↩️ Undo</button>
            <button className="btn sm red" onClick={clear}>🗑️ Clear</button>
          </div>
          <div className="hint">Fill: pick a colour, tap inside a shape — instant colouring, all your choices.</div>
        </div>

        <div className="panelcard">
          <h3>Paper drawing?</h3>
          <button className="btn blue" style={{ width: '100%', justifyContent: 'center' }} onClick={() => fileRef.current.click()}>
            📷 Upload a photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          <div className="hint">We clean the paper away so only your drawing stays.</div>
        </div>

        <button className="btn yellow big" style={{ justifyContent: 'center' }} onClick={openSave}>
          ⭐ SAVE TO TOY BOX
        </button>
      </div>

      {saveOpen && pending && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSaveOpen(false); }}>
          <div className="modal">
            <h3>Save your drawing ⭐</h3>
            <div className="save-preview">
              <img src={pending.data} alt="your drawing" />
            </div>
            <div className="field">
              <label htmlFor="nm">Give it a name</label>
              <input
                id="nm"
                type="text"
                maxLength={24}
                placeholder="e.g. Captain Sparkle"
                value={pending.name}
                onChange={(e) => setPending((p) => ({ ...p, name: e.target.value }))}
              />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm purple" onClick={suggestNames}>✨ Suggest names</button>
                {pending.names.map((n) => (
                  <button key={n} className="chip" onClick={() => setPending((p) => ({ ...p, name: n }))}>{n}</button>
                ))}
              </div>
            </div>
            {kind === 'character' && (
              <div className="field">
                <label>Role in the story</label>
                <div className="row">
                  {['goodie', 'baddie', 'sidekick', 'extra'].map((r) => (
                    <button
                      key={r}
                      className={`chip role-${r}`}
                      aria-pressed={pending.role === r}
                      onClick={() => setPending((p) => ({ ...p, role: r }))}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={pop} onChange={(e) => rePop(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--purple)' }} />
                🎨 Make my colours pop! <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--purple)' }}>(brightens your own colours)</span>
              </label>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn sm" onClick={() => setSaveOpen(false)}>Cancel</button>
              <button className="btn yellow" onClick={confirmSave}>Save it!</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .studio { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-start; }
        .board-wrap {
          background: #fff; border: var(--line-bold); border-radius: 12px;
          box-shadow: var(--shadow-panel); padding: 10px; flex: 0 1 auto;
        }
        .board-stack { position: relative; width: min(560px, calc(100vw - 380px), 74dvh); aspect-ratio: 1; }
        @media (max-width: 900px) { .board-stack { width: min(560px, calc(100vw - 70px)); } }
        .board, .guide { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 8px; }
        .board {
          touch-action: none; background: #fff;
          background-image: radial-gradient(rgba(124,92,217,.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .board[data-tool="brush"] { cursor: crosshair; }
        .board[data-tool="fill"] { cursor: cell; }
        .board[data-tool="eraser"] { cursor: grab; }
        .guide { pointer-events: none; }
        .tools { width: 300px; max-width: 100%; }
        .coach { background: linear-gradient(160deg, #eaffef, #fff); }
        .coach-step { font-weight: 800; font-size: 14.5px; min-height: 44px; display: flex; flex-direction: column; gap: 3px; }
        .coach-num { font-size: 11px; font-weight: 800; color: var(--green); text-transform: uppercase; letter-spacing: .5px; }
        .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
        .sw {
          width: 26px; height: 26px; border-radius: 50%;
          border: 2px solid var(--ink); cursor: pointer; padding: 0;
        }
        .sw[aria-pressed="true"] { outline: 3px solid var(--blue); outline-offset: 2px; }
        .sw.rainbow {
          background: conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red);
          position: relative; overflow: hidden; display: inline-block;
        }
        .sw.rainbow input { position: absolute; inset: -8px; opacity: 0; cursor: pointer; }
        .size-dot {
          background: var(--ink); border-radius: 50%;
          border: 2px solid var(--ink); cursor: pointer; padding: 0;
        }
        .size-dot[aria-pressed="true"] { outline: 3px solid var(--blue); outline-offset: 2px; }
        .save-preview {
          background: repeating-conic-gradient(#efe9dc 0% 25%, #fff 0% 50%) 50%/18px 18px;
          border: var(--line); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          padding: 8px; margin-bottom: 14px;
        }
        .save-preview img { max-width: 140px; max-height: 140px; object-fit: contain; }
        :global(.chip.role-goodie[aria-pressed="true"]) { background: var(--green); color: #fff; }
        :global(.chip.role-baddie[aria-pressed="true"]) { background: var(--red); color: #fff; }
        :global(.chip.role-sidekick[aria-pressed="true"]) { background: var(--blue); color: #fff; }
        :global(.chip.role-extra[aria-pressed="true"]) { background: var(--ink); color: #fff; }
      `}</style>
    </div>
  );
}
