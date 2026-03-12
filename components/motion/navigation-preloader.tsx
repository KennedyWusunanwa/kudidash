"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BOOT_MIN_MS = 720;
const ROUTE_MIN_MS = 320;
const EXIT_MS = 280;

function normalizeRouteKey(pathname: string | null) {
  return pathname || "/";
}

export function NavigationPreloader() {
  const pathname = usePathname();
  const routeKey = normalizeRouteKey(pathname);
  const [mode, setMode] = useState<"boot" | "route" | null>("boot");
  const [visible, setVisible] = useState(true);
  const currentRouteRef = useRef(routeKey);
  const transitionStartRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeOverlay = useCallback((minimumMs: number) => {
    clearCloseTimer();
    const elapsed = performance.now() - transitionStartRef.current;
    const remaining = Math.max(minimumMs - elapsed, 0);

    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      closeTimerRef.current = window.setTimeout(() => {
        setMode(null);
      }, EXIT_MS);
    }, remaining);
  }, [clearCloseTimer]);

  const openOverlay = useCallback((nextMode: "boot" | "route") => {
    clearCloseTimer();
    transitionStartRef.current = performance.now();
    setMode(nextMode);
    setVisible(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    let settled = false;
    transitionStartRef.current = performance.now();

    const finishBoot = () => {
      if (settled) return;
      settled = true;
      closeOverlay(BOOT_MIN_MS);
    };

    if (document.readyState === "complete") {
      finishBoot();
    } else {
      window.addEventListener("load", finishBoot, { once: true });
      closeTimerRef.current = window.setTimeout(finishBoot, BOOT_MIN_MS + 600);
    }

    return () => {
      settled = true;
      window.removeEventListener("load", finishBoot);
      clearCloseTimer();
    };
  }, [clearCloseTimer, closeOverlay]);

  const handleDocumentClick = useCallback((event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    const nextUrl = new URL(anchor.href, window.location.href);
    const currentUrl = new URL(window.location.href);
    if (nextUrl.origin !== currentUrl.origin) return;

    const nextKey = normalizeRouteKey(nextUrl.pathname);
    const currentKey = normalizeRouteKey(currentUrl.pathname);
    if (nextKey === currentKey) return;

    openOverlay("route");
  }, [openOverlay]);

  useEffect(() => {
    const handlePopState = () => openOverlay("route");
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handleDocumentClick, openOverlay]);

  useEffect(() => {
    if (currentRouteRef.current === routeKey) return;
    currentRouteRef.current = routeKey;

    if (mode === "route") {
      closeOverlay(ROUTE_MIN_MS);
    }
  }, [closeOverlay, mode, routeKey]);

  if (!mode) return null;

  return (
    <div
      aria-live="polite"
      aria-busy={visible}
      className={cn("nav-preloader", visible ? "is-visible" : "is-exiting")}
    >
      <div className="nav-preloader__veil" />
      <div className="nav-preloader__orb nav-preloader__orb--one" />
      <div className="nav-preloader__orb nav-preloader__orb--two" />
      <div className="nav-preloader__panel">
        <div className="nav-preloader__eyebrow">
          {mode === "boot" ? "Preparing workspace" : "Loading destination"}
        </div>
        <div className="nav-preloader__title">
          {mode === "boot" ? "Starting KudiDash" : "Fetching the next view"}
        </div>
        <div className="nav-preloader__subtitle">
          {mode === "boot"
            ? "Preloading shell, data hooks, and navigation state."
            : "Prefetching data and easing the page into place."}
        </div>
        <div className="nav-preloader__bar">
          <span />
        </div>
        <div className="nav-preloader__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
