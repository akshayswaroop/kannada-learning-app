import React from "react";
import { RAW_CARDS } from "../../data";

export default function KannadaRound(props) {
  const {
    promptWord,
    directionMeta,
    showTargetAnswer,
    setShowTargetAnswer,
    targetWord,
    timerBadgeStyle,
    timeLeft,
    // tile pool
    tiles,
    onDragStart,
    placeTileToFirstEmpty,
    // slots
    slots,
    onDragOverSlot,
    onDropToSlot,
    returnSlotToPool,
    // theming/helpers
    choose,
    themeColors,
    // controls
    handleSubmit,
    result,
    microFeedback,
    handleNext,
    timedOut,
  } = props;

  // Dropdown state and logic
  const [search, setSearch] = React.useState("");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const filteredCards = RAW_CARDS.filter(card =>
    card.transliteration.toLowerCase().includes(search.toLowerCase())
  );
  function handleSelectCard(card) {
    setDropdownOpen(false);
    setSearch("");
    if (props.onSelectWord) props.onSelectWord(card);
  }

  return (
    <>
      {/* Searchable Dropdown (above prompt UI) */}
      <div style={{ marginBottom: 18, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="Type to search word (English)"
            value={search}
            onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: '1.5px solid #a5b4fc',
              fontSize: 18,
              width: 260,
              outline: 'none',
              boxShadow: dropdownOpen ? '0 4px 24px rgba(99,102,241,0.08)' : 'none',
              background: '#f8fafc',
              color: '#1e293b',
              fontWeight: 600
            }}
          />
          <button
            onClick={() => setDropdownOpen(v => !v)}
            style={{
              background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: dropdownOpen ? '0 2px 8px rgba(99,102,241,0.12)' : 'none'
            }}
          >
            {dropdownOpen ? '▲' : '▼'}
          </button>
        </div>
        {dropdownOpen && (
          <div style={{
            position: 'absolute',
            top: 48,
            left: 0,
            width: 320,
            maxHeight: 260,
            overflowY: 'auto',
            background: '#fff',
            border: '1.5px solid #a5b4fc',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(99,102,241,0.13)',
            zIndex: 100
          }}>
            {filteredCards.length === 0 && (
              <div style={{ padding: 18, color: '#64748b', fontWeight: 600 }}>No matches</div>
            )}
            {filteredCards.map(card => (
              <div
                key={card.id}
                onClick={() => handleSelectCard(card)}
                style={{
                  padding: '12px 18px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 18,
                  color: '#312e81',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  transition: 'background 0.2s',
                }}
                onMouseDown={e => e.preventDefault()}
              >
                {card.transliteration} <span style={{ color: '#64748b', fontWeight: 400, fontSize: 15 }}>({card.wordKannada})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main prompt and round UI */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{promptWord}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: themeColors.textMuted }}>
            <span role="img" aria-label="switch languages">🔁</span>
            <span>Arrange this word in {directionMeta.targetLabel}</span>
            {showTargetAnswer && (
              <div style={{ textAlign: 'center', marginTop: 4, fontSize: 40, fontWeight: 900, letterSpacing: 1, color: themeColors.textPrimary }}>
                {targetWord}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ fontSize: 13, color: themeColors.textMuted }}>{directionMeta.promptLabel} → {directionMeta.targetLabel}</div>
          <div style={{ fontWeight: 800, fontSize: 16, display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: 999, background: timerBadgeStyle.background, color: timerBadgeStyle.color }}>⏱ {timeLeft}s</div>
        </div>
      </div>

      {/* Tile pool */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {tiles.map((tile, i) => (
            <div key={`${tile.g}-${i}`} style={{ position: "relative" }}>
              <div draggable onDragStart={(e) => onDragStart(e, i)} onClick={() => placeTileToFirstEmpty(i)} style={{ cursor: "grab", userSelect: "none", background: tile.c, color: "#0f172a", padding: "16px 18px", borderRadius: 12, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 76, minHeight: 72, boxShadow: "0 8px 28px rgba(0,0,0,0.06)", letterSpacing: 1 }} title="Drag to a slot or tap to place">{tile.g}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Slots */}
      <div style={{ display: 'inline-block', marginBottom: 18, padding: 12, background: themeColors.panel, borderRadius: 12, transition: "background 0.3s ease" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "nowrap", minHeight: 92 }}>
          {slots.map((slot, i) => (
            <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div onDragOver={onDragOverSlot} onDrop={(e) => onDropToSlot(e, i)} onClick={() => returnSlotToPool(i)} style={{ width: 86, height: 86, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: slot ? slot.c : choose('#ffffff', 'rgba(15,23,42,0.9)'), color: slot ? '#0f172a' : themeColors.textPrimary, boxShadow: slot ? themeColors.softShadow : themeColors.insetShadow, fontSize: 42, cursor: slot ? "pointer" : "copy", letterSpacing: 1 }} title={slot ? "Click to return to pool" : "Drop tile here"}>{slot ? slot.g : ""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: 'wrap' }}>
        <button onClick={handleSubmit} style={{ padding: "12px 22px", background: "#10b981", color: "white", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Submit</button>

        {result === 'incorrect' && microFeedback && (
          <div style={{ padding: '10px 12px', background: choose('#eef2ff', 'rgba(99,102,241,0.2)'), color: themeColors.textPrimary, borderRadius: 10, fontWeight: 800 }}>
            The next glyph is {microFeedback}. Try again!
          </div>
        )}

        {result === "correct" && <button onClick={handleNext} style={{ padding: "12px 22px", background: "#bfdbfe", borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Next</button>}
        {result === "correct" && <div style={{ marginLeft: 6, color: "#166534", fontWeight: 800 }}>✅ Correct</div>}
        {result === "incorrect" && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: choose('#fee2e2', 'rgba(248,113,113,0.2)'), color: choose('#991b1b', '#fecaca'), fontWeight: 900, fontSize: 18 }}>
            {timedOut ? '⏰ Time up' : '❌ Not correct'}
            {!showTargetAnswer && (
              <button type="button" onClick={() => setShowTargetAnswer(true)} style={{ marginLeft: 6, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, background: choose('#fde68a', 'rgba(234,179,8,0.25)'), color: themeColors.textPrimary }}>
                Show {directionMeta.targetLabel}
              </button>
            )}
            {/* Show Next button after timeout */}
            {timedOut && (
              <button onClick={handleNext} style={{ padding: "12px 22px", background: "#bfdbfe", borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Next</button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
