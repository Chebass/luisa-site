"use client";
import { AnimatePresence } from "motion/react";
export function ModalPresence({ children }: { children: React.ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
