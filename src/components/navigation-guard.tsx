"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type NavigationGuardRegistration = {
  isDirty: boolean;
  onSave: () => Promise<boolean | void>;
};

type Props = {
  children: ReactNode;
};

type NavigationGuardContextValue = {
  register: (registration: NavigationGuardRegistration | null) => void;
};

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuard({ children }: Props) {
  const router = useRouter();
  const guardRef = useRef<NavigationGuardRegistration | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const register = useCallback((registration: NavigationGuardRegistration | null) => {
    guardRef.current = registration;
  }, []);

  const requestNavigation = useCallback((href: string) => {
    if (!guardRef.current?.isDirty) {
      router.push(href);
      return;
    }

    setPendingHref(href);
  }, [router]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!guardRef.current?.isDirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (!(event.target instanceof Element)) return;

    const anchor = event.target.closest("a");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) return;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    event.stopPropagation();
    requestNavigation(`${url.pathname}${url.search}${url.hash}`);
  };

  async function saveAndNavigate() {
    if (!pendingHref || !guardRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const didSave = await guardRef.current.onSave();
      if (didSave === false) return;

      const href = pendingHref;
      setPendingHref(null);
      router.push(href);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <NavigationGuardContext.Provider value={{ register }}>
      <div onClickCapture={handleClickCapture}>
        {children}

        {pendingHref ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">저장되지 않은 변경사항</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">페이지를 이동할까요?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">현재 변경사항을 GitHub에 저장한 뒤 이동할 수 있습니다.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingHref(null)}
                  disabled={isSaving}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void saveAndNavigate()}
                  disabled={isSaving}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? "저장 중..." : "저장 후 이동"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard(registration: NavigationGuardRegistration) {
  const { register } = useNavigationGuardContext();
  const registrationRef = useRef(registration);

  useEffect(() => {
    registrationRef.current = registration;
  }, [registration]);

  useEffect(() => {
    register({
      isDirty: registration.isDirty,
      onSave: () => registrationRef.current.onSave(),
    });

    return () => register(null);
  }, [register, registration.isDirty]);
}

function useNavigationGuardContext() {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error("useNavigationGuard must be used within NavigationGuard.");
  }

  return context;
}
