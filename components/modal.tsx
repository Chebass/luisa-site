"use client";
import { useEffect, useState, useId } from "react";
import { motion, useReducedMotion, useIsPresent } from "motion/react";
import { OverlayContainerContext } from "./ui/overlay-container";
import { X } from "lucide-react";
let openDialogs = 0;
let previousOverflow = "";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  const present = useIsPresent();
  useEffect(() => {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    if (openDialogs === 0) previousOverflow = document.body.style.overflow;
    openDialogs++;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      openDialogs--;
      if (openDialogs === 0) document.body.style.overflow = previousOverflow;
    };
  }, [dialog]);
  return (
    <motion.dialog
      ref={setDialog}
      aria-labelledby={titleId}
      data-exiting={!present || undefined}
      initial={reduce ? false : { opacity: 0, scale: 0.97, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.985, y: reduce ? 0 : 8 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          onClose();
      }}
    >
      <OverlayContainerContext.Provider value={dialog}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </OverlayContainerContext.Provider>
    </motion.dialog>
  );
}
