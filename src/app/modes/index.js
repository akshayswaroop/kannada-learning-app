import React from "react";
import AppShell from "../AppShell";

// Temporary registry: keep legacy behavior by pointing to AppShell.
// Later phases will supply dedicated components per mode.
export const MODES = [
  { id: "kannada", label: "Kannada", component: AppShell },
  { id: "math", label: "Math", component: AppShell },
  { id: "english", label: "English", component: AppShell },
];

export function getModeById(id) {
  return MODES.find((mode) => mode.id === id) || MODES[0];
}
