"use client";
import { createContext, useContext } from "react";
export const OverlayContainerContext = createContext<HTMLElement | null>(null);
export function useOverlayContainer() {
  return useContext(OverlayContainerContext) ?? undefined;
}
