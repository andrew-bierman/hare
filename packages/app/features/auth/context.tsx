"use client";

import { signOut, useSession } from "@hare/auth/client";
import { createContext, type ReactNode, useContext } from "react";

/**
 * Auth context value type.
 */
export interface AuthContextValue {
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
    } | null;
  } | null;
  isPending: boolean;
  error: Error | null;
}

/**
 * Auth actions that can be performed.
 */
export interface AuthActions {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

// Default values for SSR - these avoid conditional hook calls
const SSR_SESSION_DATA: AuthContextValue = {
  data: null,
  isPending: true,
  error: null,
};

const SSR_ACTIONS: AuthActions = {
  signOut: async () => {},
};

/**
 * Internal client-only provider that uses hooks.
 * Only rendered on the client side.
 */
function ClientAuthProvider({ children }: { children: ReactNode }) {
  const session = useSession();

  const sessionData: AuthContextValue = {
    data: session.data
      ? {
          user: session.data.user
            ? {
                id: session.data.user.id,
                email: session.data.user.email,
                name: session.data.user.name ?? null,
                image: session.data.user.image ?? null,
              }
            : null,
        }
      : null,
    isPending: session.isPending,
    error: session.error ?? null,
  };

  const actions: AuthActions = {
    signOut: async () => {
      await signOut();
    },
  };

  return (
    <AuthContext.Provider value={sessionData}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthContext.Provider>
  );
}

/**
 * Provider for auth context.
 * Uses @hare/auth/client directly.
 * Returns a loading state during SSR to avoid hooks issues.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // During SSR/prerendering, render with static values (no hooks)
  if (typeof window === "undefined") {
    return (
      <AuthContext.Provider value={SSR_SESSION_DATA}>
        <AuthActionsContext.Provider value={SSR_ACTIONS}>
          {children}
        </AuthActionsContext.Provider>
      </AuthContext.Provider>
    );
  }

  // On the client, use the hook-based provider
  return <ClientAuthProvider>{children}</ClientAuthProvider>;
}

/**
 * Hook to access auth session data.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Hook to access auth actions (signOut, etc).
 * Must be used within an AuthProvider.
 */
export function useAuthActions(): AuthActions {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error("useAuthActions must be used within AuthProvider");
  }
  return context;
}
