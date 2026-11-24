"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(
          "Account created. Check your email for a confirmation link, then sign in."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Create your free account</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Save your attempts, track your band progress and unlock AI marking.
      </p>

      {!configured && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Sign-up is not available yet: Supabase is not configured on this
          deployment. Ask the site owner to set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </div>
      )}

      <form onSubmit={handleEmailSignup} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!configured}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!configured}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {success}
          </p>
        )}
        <button
          type="submit"
          disabled={!configured || loading}
          className="w-full rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={!configured}
        className="w-full rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
