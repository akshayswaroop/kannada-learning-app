import React from "react";

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

  return (
    <>
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
          </div>
        )}
      </div>
    </>
  );
}
