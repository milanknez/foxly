"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Trash2,
  HelpCircle,
} from "lucide-react";

export type DialogVariant = "danger" | "warning" | "info" | "success" | "error";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface AlertDialogOptions {
  title?: string;
  message: string;
  buttonText?: string;
  variant?: DialogVariant;
}

interface DialogContextValue {
  confirm: (optionsOrMessage: string | ConfirmDialogOptions) => Promise<boolean>;
  alert: (optionsOrMessage: string | AlertDialogOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  // Stav pro Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: DialogVariant;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Potvrdit",
    cancelText: "Zrušit",
    variant: "warning",
  });

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Stav pro Alert dialog
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    buttonText: string;
    variant: DialogVariant;
  }>({
    isOpen: false,
    title: "",
    message: "",
    buttonText: "Rozumím",
    variant: "info",
  });

  const alertResolveRef = useRef<(() => void) | null>(null);

  // Implementace confirm
  const confirm = useCallback((optionsOrMessage: string | ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;

      let title = "Potvrzení akce";
      let message = "";
      let confirmText = "Potvrdit";
      let cancelText = "Zrušit";
      let variant: DialogVariant = "warning";

      if (typeof optionsOrMessage === "string") {
        message = optionsOrMessage;
        const lower = message.toLowerCase();
        if (
          lower.includes("smazat") ||
          lower.includes("odstranit") ||
          lower.includes("zahodit") ||
          lower.includes("odebrat")
        ) {
          title = "Potvrzení smazání";
          confirmText = "Smazat";
          variant = "danger";
        }
      } else {
        message = optionsOrMessage.message;
        title = optionsOrMessage.title || (optionsOrMessage.variant === "danger" ? "Potvrzení smazání" : "Potvrzení akce");
        confirmText = optionsOrMessage.confirmText || (optionsOrMessage.variant === "danger" ? "Smazat" : "Potvrdit");
        cancelText = optionsOrMessage.cancelText || "Zrušit";
        variant = optionsOrMessage.variant || "warning";
      }

      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
  };

  // Implementace alert
  const alert = useCallback((optionsOrMessage: string | AlertDialogOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      alertResolveRef.current = resolve;

      let title = "Upozornění";
      let message = "";
      let buttonText = "Rozumím";
      let variant: DialogVariant = "info";

      if (typeof optionsOrMessage === "string") {
        message = optionsOrMessage;
        const lower = message.toLowerCase();
        if (
          lower.includes("chyba") ||
          lower.includes("selhalo") ||
          lower.includes("nepodařilo") ||
          lower.includes("nesmí")
        ) {
          title = "Chyba";
          variant = "error";
        } else if (lower.includes("úspěšn") || lower.includes("uložen")) {
          title = "Úspěch";
          variant = "success";
        }
      } else {
        message = optionsOrMessage.message;
        title = optionsOrMessage.title || (optionsOrMessage.variant === "error" ? "Chyba" : "Upozornění");
        buttonText = optionsOrMessage.buttonText || "Rozumím";
        variant = optionsOrMessage.variant || "info";
      }

      setAlertState({
        isOpen: true,
        title,
        message,
        buttonText,
        variant,
      });
    });
  }, []);

  const handleAlertClose = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
    if (alertResolveRef.current) {
      alertResolveRef.current();
      alertResolveRef.current = null;
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {/* CONFIRM MODAL */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  confirmState.variant === "danger"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : confirmState.variant === "warning"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-blue-50 text-blue-600 border border-blue-100"
                }`}
              >
                {confirmState.variant === "danger" ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmState.variant === "warning" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {confirmState.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                  {confirmState.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-colors cursor-pointer active:scale-95"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                  confirmState.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    : confirmState.variant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      {alertState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  alertState.variant === "error"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : alertState.variant === "success"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : alertState.variant === "warning"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-blue-50 text-blue-600 border border-blue-100"
                }`}
              >
                {alertState.variant === "error" ? (
                  <AlertCircle className="w-6 h-6" />
                ) : alertState.variant === "success" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : alertState.variant === "warning" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {alertState.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                  {alertState.message}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAlertClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                autoFocus
                onClick={handleAlertClose}
                className={`px-5 py-2 rounded-xl text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                  alertState.variant === "error"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    : alertState.variant === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {alertState.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    // Bezpečný fallback, pokud by komponenta byla mimo provider
    return {
      confirm: async (opt) => window.confirm(typeof opt === "string" ? opt : opt.message),
      alert: async (opt) => window.alert(typeof opt === "string" ? opt : opt.message),
    };
  }
  return ctx;
}
