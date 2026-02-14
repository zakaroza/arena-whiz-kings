import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  username: string | null;
  loading: boolean;
  signIn: (username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  loading: true,
  signIn: async () => ({}),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUser.id)
          .single();
        setUsername(data?.username ?? null);
      } else {
        setUsername(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUser.id)
          .single();
        setUsername(data?.username ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (usernameInput: string): Promise<{ error?: string }> => {
    // Check if username is taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", usernameInput)
      .single();

    if (existing) {
      return { error: "Username is already taken" };
    }

    // Sign in anonymously
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) return { error: authError.message };

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user!.id,
      username: usernameInput,
      avatar_color: getRandomColor(),
    });

    if (profileError) {
      // If profile creation fails (e.g. race condition on username), sign out
      await supabase.auth.signOut();
      if (profileError.message.includes("duplicate")) {
        return { error: "Username is already taken" };
      }
      return { error: profileError.message };
    }

    setUsername(usernameInput);
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ user, username, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

function getRandomColor(): string {
  const colors = [
    "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
