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
  const [stories, setStories] = useState([]);
  const [editItem, setEditItem] = useState(null);

  // load saved world once on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (Array.isArray(saved.items)) setItems(saved.items);
      if (saved.comic) setComic(saved.comic);
      if (Array.isArray(saved.stories)) setStories(saved.stories);
      if (saved.beginner) setBeginner(true);
    }
    setHydrated(true);
  }, []);

  // persist on change
  useEffect(() => { if (hydrated) saveState({ items }); }, [items, hydrated]);
  useEffect(() => { if (hydrated && comic) saveState({ comic }); }, [comic, hydrated]);
  useEffect(() => { if (hydrated) saveState({ stories }); }, [stories, hydrated]);
  useEffect(() => { if (hydrated) saveState({ beginner }); }, [beginner, hydrated]);

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(flash._t);
    flash._t = setTimeout(() => setToast(null), 1900);
  }, []);

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, item]);
  }, []);
  const addItems = useCallback((newItems) => {
    setItems((prev) => [...prev, ...newItems]);
  }, []);
  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);
  const renameItem = useCallback((id, name) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);
  const updateItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const startEdit = useCallback((item) => { setEditItem(item); setTab('draw'); }, []);
  const endEdit = useCallback(() => setEditItem(null), []);
  const addStory = useCallback((plan) => {
    setStories((prev) => [{ id: Date.now(), when: new Date().toISOString(), ...plan }, ...prev].slice(0, 20));
  }, []);
  const removeStory = useCallback((id) => {
    setStories((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div className="title">{`Oscar's Comic Maker`}</div>
        <div className="issue">Drawn by Oscar!</div>
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
          <Studio
            beginner={beginner}
            addItem={addItem}
            flash={flash}
            editItem={editItem}
            endEdit={endEdit}
            updateItem={updateItem}
          />
        )}
        {tab === 'library' && (
          <Library
            items={items}
            removeItem={removeItem}
            renameItem={renameItem}
            updateItem={updateItem}
            addItems={addItems}
            startEdit={startEdit}
            flash={flash}
          />
        )}
        {tab === 'comic' && (
          <Comic
            items={items}
            comic={comic}
            setComic={setComic}
            flash={flash}
            goDraw={() => setTab('draw')}
            stories={stories}
            addStory={addStory}
            removeStory={removeStory}
          />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
