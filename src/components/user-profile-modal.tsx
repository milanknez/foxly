"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Key,
  Camera,
  Upload,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Lock,
  Dices,
  Sparkles,
} from "lucide-react";
import { ANIMATED_AVATAR_PRESETS, getRandomAnimatedAvatar } from "@/lib/avatars";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  userRole?: string;
  onProfileUpdated?: (updated: { name: string; avatarUrl?: string | null }) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  userRole,
  onProfileUpdated,
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const [name, setName] = useState(currentUser.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatarUrl || "");
  const [avatarCategory, setAvatarCategory] = useState<string>("all");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Nahrání vlastního souboru obrázku z disku (převod na Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vyberte prosím platný soubor obrázku (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Velikost obrázku nesmí přesáhnout 2 MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (activeTab === "password") {
      if (!currentPassword) {
        setError("Zadejte Vaše stávající heslo.");
        return;
      }
      if (newPassword.length < 6) {
        setError("Nové heslo musí mít alespoň 6 znaků.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Nové heslo a potvrzení hesla se neshodují.");
        return;
      }
    } else {
      if (name.trim().length < 2) {
        setError("Jméno musí mít alespoň 2 znaky.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {};
      if (activeTab === "profile") {
        payload.name = name.trim();
        payload.avatarUrl = avatarUrl.trim() || null;
      } else {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Uložení selhalo.");
      }

      setSuccess(
        activeTab === "profile"
          ? "Váš profil a avatar byly úspěšně uloženy!"
          : "Vaše heslo bylo úspěšně změněno!"
      );

      if (activeTab === "password") {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      if (onProfileUpdated && data.user) {
        onProfileUpdated({
          name: data.user.name,
          avatarUrl: data.user.avatarUrl,
        });
      }

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Nastala chyba při ukládání.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Hlavička */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Můj profil & Zabezpečení</h3>
              <p className="text-[11px] text-slate-500">{currentUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Přepínač záložek */}
        <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
              setError(null);
              setSuccess(null);
            }}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Osobní údaje & Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("password");
              setError(null);
              setSuccess(null);
            }}
            className={`py-3 ml-6 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "password"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Změna hesla</span>
          </button>
        </div>

        {/* Tělo formuláře */}
        <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {activeTab === "profile" ? (
            <>
              {/* Sekce Avatar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Profilový avatar
                </label>

                <div className="flex items-center gap-4">
                  {/* Náhled avataru */}
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xl ring-2 ring-slate-200 shadow-sm">
                        <User className="w-8 h-8 text-white/90" />
                      </div>
                    )}

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        title="Obnovit výchozí avatar"
                        className="absolute -top-1 -right-1 p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full border border-slate-200 shadow-xs cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const rand = getRandomAnimatedAvatar(avatarCategory === "all" ? undefined : avatarCategory);
                          setAvatarUrl(rand);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        <span>🎲 Náhodný animovaný</span>
                      </button>

                      <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs text-[11px]">
                        <Upload className="w-3 h-3 text-slate-500" />
                        <span>Vlastní soubor</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl("")}
                          className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Výchozí iniciály</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Klikněte na „Náhodný animovaný“ nebo vyberte z přednastavených níže.
                    </p>
                  </div>
                </div>

                {/* Předvolby animovaných avatarů */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Animované postavičky & roboti:
                    </span>
                    <div className="flex gap-1 text-[10px]">
                      {[
                        { id: "all", label: "Vše" },
                        { id: "characters", label: "Postavy" },
                        { id: "robots", label: "Roboti" },
                        { id: "adventurers", label: "Dobrodruzi" },
                        { id: "emoji", label: "Emoji" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAvatarCategory(cat.id)}
                          className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                            avatarCategory === cat.id
                              ? "bg-blue-600 text-white font-bold"
                              : "text-slate-500 hover:bg-slate-200/60"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {ANIMATED_AVATAR_PRESETS.filter(
                      (av) => avatarCategory === "all" || av.category === avatarCategory
                    ).map((av) => (
                      <button
                        type="button"
                        key={av.id}
                        onClick={() => setAvatarUrl(av.url)}
                        title={av.label}
                        className={`relative rounded-full overflow-hidden transition-all p-0.5 cursor-pointer hover:scale-110 ${
                          avatarUrl === av.url
                            ? "ring-2 ring-blue-600 shadow-md scale-105"
                            : "ring-1 ring-slate-200 hover:ring-blue-300 opacity-85 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={av.url}
                          alt={av.label}
                          className="w-10 h-10 rounded-full object-cover bg-slate-100"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Jméno a Příjmení */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jméno a příjmení <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Např. Milan Novák"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* E-mail (read-only) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Přihlašovací e-mail (nepřenosný)
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg text-xs cursor-not-allowed"
                />
              </div>

              {/* Informace o roli */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-slate-700">Systémové oprávnění:</span>
                </div>
                <span className="font-bold text-blue-700 uppercase tracking-wide text-[10px] bg-blue-100/70 px-2 py-0.5 rounded">
                  {userRole || "ADMIN"}
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Změna hesla */}
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Pro zabezpečení Vašeho účtu zadejte současné heslo a následně nové heslo o délce minimálně 6 znaků.
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Současné stávající heslo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nové heslo (min. 6 znaků) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Zadejte nové heslo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Potvrzení nového hesla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Zadejte znovu nové heslo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Patička s tlačítky */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
            >
              Zavřít
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{activeTab === "profile" ? "Uložit profil" : "Změnit heslo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
