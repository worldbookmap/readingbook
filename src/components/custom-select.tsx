"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";

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
  hasError?: boolean;
  onEditOption?: (value: string) => void;
  onDeleteOption?: (value: string) => void;
};

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "선택",
  className = "",
  menuClassName = "",
  hasError = false,
  onEditOption,
  onDeleteOption,
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
        className={`flex w-full items-center justify-between gap-2 rounded-[14px] border px-2 py-1.5 text-left text-sm shadow-[0_4px_10px_rgba(15,23,42,0.025)] outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-slate-200/80 ${
          hasError
            ? "border-rose-300 bg-rose-50/70 text-rose-700 hover:border-rose-400"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate text-[12.5px] sm:text-sm">{selectedOption?.label ?? placeholder}</span>
        <span className={`shrink-0 text-base leading-none font-semibold text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          className={`absolute z-50 mt-1.5 w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl ${menuClassName}`}
          role="listbox"
        >
          <div className="max-h-72 overflow-y-auto p-1">
            {options.map((option) => {
              const showActionButtons = !option.disabled && option.value !== "__new__" && (onEditOption || onDeleteOption);

              return (
                <div
                  key={option.value}
                  className={`flex w-full min-w-0 items-center justify-between gap-1 rounded-[10px] px-1 py-1 transition-all duration-150 ${
                    option.value === value
                      ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                        return;
                      }

                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-1 overflow-hidden rounded-[7px] px-1.5 py-1.5 text-left text-sm"
                    role="option"
                    aria-selected={option.value === value}
                  >
                    <span className="block min-w-0 truncate text-[12.5px] sm:text-sm">{option.label}</span>
                    {option.value === value ? <span className="shrink-0 text-[10px] font-bold">✓</span> : null}
                  </button>

                  {showActionButtons ? (
                    <div className="flex shrink-0 flex-nowrap items-center gap-0.5">
                      {onEditOption ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditOption(option.value);
                          }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[9px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                          aria-label={`${option.label} 수정`}
                          title="수정"
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                      ) : null}

                      {onDeleteOption ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteOption(option.value);
                          }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                          aria-label={`${option.label} 삭제`}
                          title="삭제"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
