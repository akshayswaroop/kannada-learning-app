import React, { useState } from "react";
import AppShell from "./app/AppShell";
import { MODES, getModeById } from "./app/modes";
import { ModeProvider } from "./app/ModeContext";

export default function App() {
  const [activeModeId, setActiveModeId] = useState(MODES[0]?.id || "kannada");
  const activeMode = getModeById(activeModeId);

  return (
    <ModeProvider modes={MODES} activeModeId={activeModeId} setActiveModeId={setActiveModeId}>
      <AppShell activeMode={activeMode} />
    </ModeProvider>
  );
}
