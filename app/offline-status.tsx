"use client";

import { useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export default function OfflineStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    // Development assets change constantly; test offline support with build/start.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("ServiceHub : inscription du service worker impossible.", error));
  }, []);

  if (online) return null;

  return (
    <aside role="status" aria-live="polite" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <p className="font-semibold">Vous êtes hors ligne</p>
      <p className="mt-1 text-sm leading-6">Vous consultez le catalogue sauvegardé. Les informations peuvent être anciennes.</p>
      <button onClick={() => window.location.reload()} className="mt-3 min-h-11 w-full rounded-lg border border-current px-4 py-2 text-sm font-semibold hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-auto">Recharger la page</button>
    </aside>
  );
}
