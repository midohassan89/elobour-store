import { create } from "zustand";

export type AuthUser = {
  id: string;
  phone: string;
  pointsBalance: number;
};

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  login: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.phone === "string" &&
    typeof record.pointsBalance === "number"
  );
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  login: async (phone) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const payload = (await response.json().catch(() => null)) as { user?: unknown; error?: unknown } | null;

    if (!response.ok || !isAuthUser(payload?.user)) {
      const data = payload ?? {};
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : (data.error as { message?: string } | undefined)?.message ||
            (data as { message?: string }).message ||
            "تعذر تسجيل الدخول";
      throw new Error(errorMessage);
    }

    set({ user: payload.user, ready: true });
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, ready: true });
  },
  hydrate: async () => {
    try {
      const response = await fetch("/api/auth/session");
      const payload = (await response.json().catch(() => null)) as { user?: unknown } | null;
      set({ user: isAuthUser(payload?.user) ? payload.user : null, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },
}));
