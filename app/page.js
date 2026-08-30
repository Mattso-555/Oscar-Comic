'use client';

import { useEffect, useState, useCallback } from 'react';
import Studio from '@/components/Studio';
import Library from '@/components/Library';
import Comic from '@/components/Comic';
import { loadState, saveState } from '@/lib/store';

export default function Home() {
  const [tab, setTab] = useState('draw');
  const [beginner, setBeginner] = useState(false);
  const [items, setItems] = useState([]);        // the toy box
  const [comic, setComic] = useState(null);      // pages data
  const [toast, setToast] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // load saved world once on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (Array.isArray(saved.items)) setItems(saved.items);
      if (saved.comic) setComic(saved.comic);
      if (saved.beginner) setBeginner(true);
    }
    setHydrated(true);
  }, []);

  // persist on change
  useEffect(() => { if (hydrated) saveState({ items }); }, [items, hydrated]);
  useEffect(() => { if (hydrated && comic) saveState({ comic }); }, [comic, hydrated]);
  useEffect(() => { if (hydrated) saveState({ beginner }); }, [beginner, hydrated]);

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 1900);
  }, []);

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, item]);
  }, []);
  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);
  const renameItem = useCallback((id, name) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);

  return (
    <div>
      <header className="masthead">
        <div className="title">Scribble Studio</div>
        <div className="issue">Your own comics!</div>
        <div className="spacer" />
        <button
          className="sticker-toggle"
          data-on={beginner}
          onClick={() => setBeginner((b) => !b)}
          aria-pressed={beginner}
        >
          🌱 Beginner help <span className="pip" />
        </button>
      </header>

      <nav className="tabs" role="tablist">
        {[
          ['draw', '✏️ Draw'],
          ['library', '🧸 Toy Box'],
          ['comic', '💥 Comic'],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            className="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="page-wrap">
        {tab === 'draw' && (
          <Studio beginner={beginner} addItem={addItem} flash={flash} />
        )}
        {tab === 'library' && (
          <Library items={items} removeItem={removeItem} renameItem={renameItem} />
        )}
        {tab === 'comic' && (
          <Comic
            items={items}
            comic={comic}
            setComic={setComic}
            flash={flash}
            goDraw={() => setTab('draw')}
          />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
