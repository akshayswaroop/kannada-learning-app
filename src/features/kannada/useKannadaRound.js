import React, { useMemo, useEffect, useState } from "react";

export function useKannadaRound({ card, direction, theme, TILE_HUES, paletteFor, isVowelGlyph, onPlacement, onAttempt }) {
  const DIRECTION_OPTIONS = {
    'hi-to-kn': { value: 'hi-to-kn', label: 'Hindi → Kannada', promptLabel: 'Hindi', targetLabel: 'Kannada' },
    'kn-to-hi': { value: 'kn-to-hi', label: 'Kannada → Hindi', promptLabel: 'Kannada', targetLabel: 'Hindi' },
  };
  const directionMeta = DIRECTION_OPTIONS[direction] || DIRECTION_OPTIONS['hi-to-kn'];

  const targetScript = direction === 'hi-to-kn' ? 'kn' : 'hi';
  const promptScript = direction === 'hi-to-kn' ? 'hi' : 'kn';

  const promptWord = useMemo(() => {
    if (!card) return '';
    if (direction === 'hi-to-kn') {
      if (card.wordHindi && card.wordHindi.length) return card.wordHindi;
      return card.transliterationHi || card.transliteration || '';
    }
    return card.wordKannada || '';
  }, [card, direction]);

  const targetWord = useMemo(() => {
    if (!card) return '';
    return direction === 'hi-to-kn' ? (card.wordKannada || '') : (card.wordHindi || '');
  }, [card, direction]);

  // Compute clusters and per-glyph color mapping based on the target word
  const clusters = useMemo(() => Array.from(targetWord || ""), [targetWord]);
  const colors = useMemo(() => paletteFor ? paletteFor(clusters.length) : [], [clusters.length, paletteFor]);
  const glyphColorMap = useMemo(() => {
    const map = {};
    const themeMode = theme === 'dark' ? 'dark' : 'light';
    const vowelArr = (TILE_HUES && TILE_HUES[themeMode] && TILE_HUES[themeMode].vowel) || [];
    const consArr = (TILE_HUES && TILE_HUES[themeMode] && TILE_HUES[themeMode].cons) || [];
    let vi = 0, ci = 0;
    for (const g of clusters) {
      if (map[g]) continue;
      if (isVowelGlyph && isVowelGlyph(g, targetScript) && vowelArr.length) { map[g] = vowelArr[vi % vowelArr.length]; vi++; }
      else if ((!isVowelGlyph || !isVowelGlyph(g, targetScript)) && consArr.length) { map[g] = consArr[ci % consArr.length]; ci++; }
      else {
        const idx = Object.keys(map).length; map[g] = colors[idx % (colors.length || 1)] || undefined;
      }
    }
    return map;
  }, [clusters, theme, TILE_HUES, colors, targetScript, isVowelGlyph]);

  function tileColorFor(glyph, idx) {
    return glyphColorMap[glyph] || (colors.length ? colors[idx % colors.length] : undefined);
  }

  // Tiles/slots state + handlers live here to simplify AppShell

  const [tiles, setTiles] = useState([]);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const base = clusters.map((g, i) => ({ g, idx: i, c: tileColorFor(g, i) }));
    // simple shuffle
    const copy = [...base];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setTiles(copy);
    setSlots(new Array(clusters.length).fill(null));
  }, [card, targetWord]);

  function onDragStart(e, tileIndex) {
    e.dataTransfer.setData("text/plain", String(tileIndex));
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOverSlot(e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
  function onDropToSlot(e, slotIndex) {
    e.preventDefault();
    const tileIndexStr = e.dataTransfer.getData("text/plain");
    if (tileIndexStr === "") return;
    const tileIndex = Number(tileIndexStr);
    if (Number.isNaN(tileIndex)) return;
    const tile = tiles[tileIndex];
    if (!tile) return;
    const newTiles = tiles.filter((_, i) => i !== tileIndex);
    const existing = slots[slotIndex];
    const newSlots = [...slots];
    newSlots[slotIndex] = { ...tile, c: tileColorFor(tile.g, slotIndex) };
    setTiles(existing ? [...newTiles, existing] : newTiles);
    setSlots(newSlots);
    onAttempt && onAttempt();
    const correctGlyph = clusters[slotIndex];
    onPlacement && onPlacement(tile.g === correctGlyph, slotIndex);
  }
  function placeTileToFirstEmpty(tileIdx) {
    const tile = tiles[tileIdx];
    if (!tile) return;
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    const newTiles = tiles.filter((_, i) => i !== tileIdx);
    const newSlots = [...slots];
    newSlots[firstEmpty] = { ...tile, c: tileColorFor(tile.g, firstEmpty) };
    setTiles(newTiles);
    setSlots(newSlots);
    onAttempt && onAttempt();
    const correctGlyph = clusters[firstEmpty];
    onPlacement && onPlacement(tile.g === correctGlyph, firstEmpty);
  }
  function returnSlotToPool(slotIdx) {
    const tile = slots[slotIdx];
    if (!tile) return;
    const newSlots = [...slots];
    newSlots[slotIdx] = null;
    setSlots(newSlots);
    setTiles((prev) => [...prev, tile]);
    onAttempt && onAttempt();
  }

  return { directionMeta, targetScript, promptScript, promptWord, targetWord, clusters, tileColorFor, tiles, slots, onDragStart, onDragOverSlot, onDropToSlot, placeTileToFirstEmpty, returnSlotToPool };
}
