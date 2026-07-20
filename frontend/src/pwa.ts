import { Platform } from "react-native";

// Registers the PWA manifest, meta tags, and service worker at runtime.
// This works regardless of the Expo web output mode (single/static), and in
// both the dev server and the exported build (public/ assets are served at root).
export function setupPWA() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const head = document.head;

  const ensureLink = (rel: string, href: string, extra: Record<string, string> = {}) => {
    if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
    const el = document.createElement("link");
    el.rel = rel;
    el.href = href;
    Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
    head.appendChild(el);
  };

  const ensureMeta = (name: string, content: string) => {
    let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.name = name;
      head.appendChild(el);
    }
    el.content = content;
  };

  ensureLink("manifest", "/manifest.json");
  ensureLink("apple-touch-icon", "/icons/apple-touch-icon.png");
  ensureLink("icon", "/icons/icon-192.png", { type: "image/png", sizes: "192x192" });
  ensureMeta("theme-color", "#FF5A5F");
  ensureMeta("mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-status-bar-style", "default");
  ensureMeta("apple-mobile-web-app-title", "WhoHas");
  ensureMeta("application-name", "WhoHas");

  if (document.title === "frontend" || !document.title) {
    document.title = "WhoHas — Best Grocery Prices";
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}
