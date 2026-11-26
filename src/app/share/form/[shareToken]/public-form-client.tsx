"use client";

import { useState } from "react";
import { CheckCircle2, Send, Loader2, Database } from "lucide-react";

interface Column {
  id: string;
  key: string;
  label: string;
  type: string;
  isRequired: boolean;
  config: Record<string, unknown>;
}

export default function PublicFormClient({
  shareToken,
  title,
  description,
  companyName,
  columns,
  config,
}: {
  shareToken: string;
  title: string;
  description: string;
  companyName: string;
  columns: Column[];
  config: Record<string, unknown>;
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allowedFieldKeys = (config.fields as string[]) || columns.map((c) => c.key);
  const visibleColumns = columns.filter((c) => allowedFieldKeys.includes(c.key));
  const customLabels = (config.fieldLabels as Record<string, string>) || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/public/forms/${shareToken}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: formData,
          _honeypot: honeypot, // Ochrana proti spamu
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Odeslání se nezdařilo");
      }

      setSuccessMessage(resData.message || "Děkujeme, formulář byl úspěšně odeslán!");
      setSubmitted(true);
      setFormData({});
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Chyba při odesílání");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (submitted) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Úspěšně odesláno</h2>
        <p className="text-slate-600 text-sm">{successMessage}</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          Odeslat další odpověď
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
          <Database className="w-3.5 h-3.5" /> {companyName}
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-spam skryté pole pro boty (honeypot) */}
        <div className="hidden">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {visibleColumns.map((col) => {
          const label = customLabels[col.key] || col.label;

          return (
            <div key={col.id}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {label} {col.isRequired && <span className="text-red-500">*</span>}
              </label>

              {col.type === "LONG_TEXT" ? (
                <textarea
                  rows={4}
                  required={col.isRequired}
                  value={String(formData[col.key] || "")}
                  onChange={(e) => handleInputChange(col.key, e.target.value)}
                  placeholder="Zadejte text..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              ) : col.type === "CHECKBOX" ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id={`pub_${col.key}`}
                    checked={!!formData[col.key]}
                    onChange={(e) => handleInputChange(col.key, e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor={`pub_${col.key}`} className="text-xs text-slate-700">
                    Ano, souhlasím
                  </label>
                </div>
              ) : col.type === "DATE" ? (
                <input
                  type="date"
                  required={col.isRequired}
                  value={String(formData[col.key] || "")}
                  onChange={(e) => handleInputChange(col.key, e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              ) : col.type === "NUMBER" || col.type === "CURRENCY" ? (
                <input
                  type="number"
                  required={col.isRequired}
                  value={String(formData[col.key] || "")}
                  onChange={(e) => handleInputChange(col.key, Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  required={col.isRequired}
                  value={String(formData[col.key] || "")}
                  onChange={(e) => handleInputChange(col.key, e.target.value)}
                  placeholder="Vaše odpověď..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm mt-4"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" /> Odeslat formulář
            </>
          )}
        </button>
      </form>
    </div>
  );
}
