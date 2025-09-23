import React, { createContext, useContext } from "react";

const ModeContext = createContext({
  modes: [],
  activeModeId: "",
  setActiveModeId: () => {},
});

export function ModeProvider({ modes, activeModeId, setActiveModeId, children }) {
  return (
    <ModeContext.Provider value={{ modes, activeModeId, setActiveModeId }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useModeContext() {
  return useContext(ModeContext);
}
