'use client';

import { useState } from 'react';
import { offlineIdeas, offlineNext, offlineLines, offlinePlan } from '@/lib/offline';

const PERSONA = `You are Sparky, a gleefully inventive storyteller for kids aged 6-10 — a mix of Roald Dahl's mischief and an improv comedian who says "yes, and!". Your ideas are specific and surprising, never generic ("a dragon terrified of its own hiccups", not "a scary dragon"). You use the child's OWN drawings by name and give them personality. You NEVER generate or draw images — when a scene needs something new, you dare the kid to draw it themselves and make the dare sound irresistible. Simple, punchy language; gloriously wild imagination.`;

function castSummary(items) {
  const parts = [];
  const chars = items.filter((i) => i.tag === 'character');
  if (chars.length) parts.push('characters: ' + chars.map((c) => `${c.name} (a ${c.subType || ''} ${c.role || 'character'})`).join(', '));
  const bds = items.filter((i) => i.tag === 'backdrop');
  if (bds.length) parts.push('places: ' + bds.map((b) => b.name).join(', '));
  const props = items.filter((i) => i.tag === 'prop');
  if (props.length) parts.push('things: ' + props.map((p) => p.name).join(', '));
  return parts.length ? parts.join(' | ') : 'a brand-new hero (nothing drawn yet)';
}

async function askClaude(prompt) {
  const res = await fetch('/api/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: PERSONA, prompt, maxTokens: 1200 }),
  });
  if (!res.ok) throw new Error('no-ai');
  const { text } = await res.json();
  return text.replace(/```json|```/g, '').trim();
}

export default function StoryHelper({ items, applyPlan, addBubble, goDraw, flash }) {
  const [out, setOut] = useState(null);   // {kind, ideas} | {kind:'plan', title, panels}
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState(null); // 'ai' | 'offline'

  const run = async (kind) => {
    setBusy(true);
    const cast = castSummary(items);
    const dare = 'When a scene needs something not yet drawn, phrase it as an exciting dare to DRAW it.';
    try {
      let text;
      if (kind === 'plan') {
        text = await askClaude(`My cast and world: ${cast}. Write a surprising, funny short COMIC (not a book!) starring MY drawings. Comics talk in SPEECH BUBBLES: the story must be told through short punchy dialogue, not narration. Rules: 3-6 panels; each panel has 1-2 dialogue lines (under 10 words each, bursting with personality) and/or ONE action word (like "ACHOO!" or "KABOOM!"); captions are RARE — at most one every 3 panels, max 6 words (like "Meanwhile…" or "One hour later…"). Use each drawing's EXACT name as the "who" (the app places drawings and bubbles automatically). Weave in my props, weapons, vehicles and places by exact name. Give it a twist and a silly ending. ${dare} Return ONLY JSON: {"title":"...","panels":[{"caption":null,"dialogue":[{"who":"exact name","says":"short line"}],"sfx":null}]}`);
        const plan = JSON.parse(text);
        setOut({ kind, title: plan.title, panels: plan.panels.slice(0, 9) });
      } else {
        const prompts = {
          idea: `My cast and world: ${cast}. Dream up 3 brand-new comic adventures I'd never think of — each a specific, surprising premise. Star my drawings by name. ${dare} Each under 22 words. Return ONLY a JSON array of 3 strings.`,
          next: `My cast and world: ${cast}. Give me 3 wildly different "what happens next" twists using my characters by name. Avoid the obvious. ${dare} At least one dares me to draw something new. Each under 20 words. Return ONLY a JSON array of 3 strings.`,
          line: `My cast: ${cast}. Write 3 short dialogue lines bursting with personality, each clearly in one character's voice. Each under 14 words. Return ONLY a JSON array of 3 strings.`,
        };
        text = await askClaude(prompts[kind]);
        setOut({ kind, ideas: JSON.parse(text).slice(0, 3) });
      }
      setSource('ai');
    } catch {
      // seamless offline fallback
      if (kind === 'plan') setOut({ kind, ...offlinePlan(items) });
      else setOut({ kind, ideas: { idea: offlineIdeas, next: offlineNext, line: offlineLines }[kind](items) });
      setSource('offline');
    }
    setBusy(false);
  };

  const useIdea = (idea, kind) => {
    if (kind === 'line') { addBubble(idea.replace(/^"|"$/g, '')); flash('Line added! 💬'); }
    else { goDraw(); flash('Now draw it! ✏️'); }
  };

  return (
    <div className="panelcard helper">
      <div className="role-tag">🤝 Story Helper · never draws</div>
      <h3>Stuck on the story?</h3>
      <div className="row">
        <button className="btn sm purple" disabled={busy} onClick={() => run('next')}>✨ What happens next?</button>
        <button className="btn sm blue" disabled={busy} onClick={() => run('line')}>🗯️ Give me a line</button>
        <button className="btn sm yellow" disabled={busy} onClick={() => run('idea')}>🌟 New adventure</button>
        <button className="btn sm green" disabled={busy} onClick={() => run('plan')}>📖 Plan my comic</button>
      </div>

      <div className="out">
        {busy && <span className="spin" aria-label="thinking" />}
        {!busy && !out && <>Ideas pop up here. The helper gives you <b>words</b> — when a scene needs something, it dares <b>you</b> to draw it.</>}
        {!busy && out && out.kind !== 'plan' && (
          <>
            {out.ideas.map((idea, i) => (
              <button key={i} className="idea" onClick={() => useIdea(idea, out.kind)}>
                <span>• {idea}</span>
                <em>{out.kind === 'line' ? 'use ›' : /draw/i.test(idea) ? 'draw ›' : ''}</em>
              </button>
            ))}
            <div className="note">{out.kind === 'line' ? '↑ tap a line to add it' : '↑ tap an idea — tap the button again for more!'}</div>
          </>
        )}
        {!busy && out && out.kind === 'plan' && (
          <>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>📖 “{out.title}” — {out.panels.length} panels:</div>
            {out.panels.map((b, i) => {
              const beat = typeof b === 'string' ? { caption: b, dialogue: [], sfx: null } : b;
              return (
                <div key={i} className="beat">
                  <b>Panel {i + 1}:</b>
                  {beat.caption && <span> 📜 {beat.caption}</span>}
                  {(beat.dialogue || []).map((dl, j) => (
                    <div key={j} className="dl">💬 <b>{dl.who}:</b> “{dl.says}”</div>
                  ))}
                  {beat.sfx && <div className="dl">💥 {beat.sfx}</div>}
                </div>
              );
            })}
            <button className="btn sm green" style={{ marginTop: 8 }} onClick={() => applyPlan(out)}>
              📖 Build this story with my drawings
            </button>
            <div className="note">Drawings, speech bubbles and action words get placed — arrange them and draw what's missing!</div>
          </>
        )}
        {!busy && out && source === 'offline' && (
          <div className="src">offline ideas — add an API key on Vercel for the full story brain</div>
        )}
      </div>

      <style jsx>{`
        .helper { background: linear-gradient(165deg, #f1ecff, #fff); }
        .role-tag {
          font-size: 10.5px; font-weight: 800; letter-spacing: .6px;
          text-transform: uppercase; color: var(--purple); margin-bottom: 2px;
        }
        .out {
          background: #fff; border: 2px dashed var(--purple); border-radius: 10px;
          padding: 10px; margin-top: 10px; font-weight: 600; font-size: 13.5px;
          min-height: 44px; line-height: 1.4;
        }
        .idea {
          display: flex; justify-content: space-between; gap: 8px; width: 100%;
          border: none; background: none; text-align: left; cursor: pointer;
          font: inherit; font-weight: 700; padding: 7px 6px; border-radius: 8px;
        }
        .idea:hover { background: #f1ecff; }
        .idea em { font-style: normal; font-size: 11px; font-weight: 800; color: var(--red); white-space: nowrap; }
        .beat { padding: 6px 4px; font-weight: 700; border-bottom: 1px dashed #ddd4f5; }
        .dl { padding: 2px 0 0 10px; font-weight: 700; }
        .note { font-size: 11px; font-weight: 800; color: var(--purple); margin-top: 8px; }
        .src { font-size: 10.5px; font-weight: 700; color: #a9a695; margin-top: 8px; }
        .spin {
          display: inline-block; width: 18px; height: 18px;
          border: 3px solid var(--purple); border-top-color: transparent;
          border-radius: 50%; animation: sp .7s linear infinite;
        }
        @keyframes sp { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
