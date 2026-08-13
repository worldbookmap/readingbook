"use client";

import { useEffect, useRef, useState } from "react";

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
};

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "선택",
  className = "",
  menuClassName = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] outline-none transition duration-200 hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <span className={`text-base font-semibold text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          className={`absolute z-50 mt-2 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 shadow-[0_25px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl ${menuClassName}`}
          role="listbox"
        >
          <div className="max-h-72 overflow-y-auto p-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.disabled) {
                    return;
                  }

                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-2.5 text-left text-sm transition ${
                  option.value === value
                    ? "bg-slate-900 text-white shadow-[0_12px_25px_rgba(15,23,42,0.12)]"
                    : "text-slate-700 hover:bg-slate-100"
                } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                role="option"
                aria-selected={option.value === value}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value ? <span className="text-xs font-bold">✓</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
