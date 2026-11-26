import React from "react";

interface FoxlyLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
}

export function FoxIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="foxGradient" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb923c" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="foxWhite" x1="12" y1="20" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#fed7aa" />
        </linearGradient>
      </defs>

      {/* Uši */}
      <polygon points="10,6 20,20 8,24" fill="url(#foxGradient)" />
      <polygon points="38,6 28,20 40,24" fill="url(#foxGradient)" />
      {/* Vnitřek uší */}
      <polygon points="12,10 18,19 10,21" fill="#fff" opacity="0.8" />
      <polygon points="36,10 30,19 38,21" fill="#fff" opacity="0.8" />

      {/* Hlava lišky (hlavní oranžové tělo) */}
      <polygon points="6,22 42,22 24,42" fill="url(#foxGradient)" />

      {/* Bílé líce */}
      <polygon points="6,22 17,22 24,37 13,33" fill="url(#foxWhite)" />
      <polygon points="42,22 31,22 24,37 35,33" fill="url(#foxWhite)" />

      {/* Oči */}
      <circle cx="17" cy="27" r="2.2" fill="#1e293b" />
      <circle cx="31" cy="27" r="2.2" fill="#1e293b" />
      <circle cx="16.3" cy="26.3" r="0.7" fill="#ffffff" />
      <circle cx="30.3" cy="26.3" r="0.7" fill="#ffffff" />

      {/* Čumáček */}
      <ellipse cx="24" cy="40.5" rx="3" ry="2" fill="#1e293b" />
    </svg>
  );
}

export default function FoxlyLogo({
  className = "",
  iconOnly = false,
  size = "md",
  variant = "dark",
}: FoxlyLogoProps) {
  const sizeClasses = {
    sm: "h-7 gap-2 text-base",
    md: "h-9 gap-2.5 text-lg",
    lg: "h-11 gap-3 text-2xl",
    xl: "h-14 gap-3.5 text-3xl",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-9 h-9",
    xl: "w-12 h-12",
  };

  return (
    <div className={`inline-flex items-center font-black tracking-tight select-none ${sizeClasses[size]} ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center p-1 rounded-xl bg-orange-50 border border-orange-100 shadow-xs">
        <FoxIcon className={iconSizes[size]} />
      </div>
      {!iconOnly && (
        <span className={variant === "dark" ? "text-slate-900" : "text-white"}>
          Fox<span className="text-orange-500">ly</span>
        </span>
      )}
    </div>
  );
}
