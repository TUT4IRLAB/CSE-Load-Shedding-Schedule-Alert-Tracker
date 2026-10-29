
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Area = {
  id: string | number;
  name: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [areaId, setAreaId] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [showAreaResults, setShowAreaResults] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      setAreasLoading(true);
      setAreasError("");

      try {
        const response = await fetch(`${API_URL}/api/areas`);
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof data.message === "string"
              ? data.message
              : "Could not load areas.";

          throw new Error(message);
        }

        const loadedAreas: Area[] = Array.isArray(data)
          ? data
          : typeof data === "object" &&
              data !== null &&
              "areas" in data &&
              Array.isArray(data.areas)
            ? data.areas
            : [];

        if (!cancelled) {
          setAreas(loadedAreas);

          if (loadedAreas.length === 0) {
            setAreasError("No areas are currently available.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAreas([]);
          setAreasError(
            err instanceof Error
              ? err.message
              : "Could not connect to load areas."
          );
        }
      } finally {
        if (!cancelled) {
          setAreasLoading(false);
        }
      }
    }

    loadAreas();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAreas = useMemo(() => {
    const search = areaSearch.trim().toLowerCase();

    if (!search) return areas;

    return areas.filter((area) =>
      area.name.toLowerCase().includes(search)
    );
  }, [areas, areaSearch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Please enter your name, email, and password.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: trimmedName,
          email: normalizedEmail,
          password,
          area_id: areaId ? Number(areaId) : null,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "Registration failed.";

        throw new Error(message);
      }

      setSuccess("Account created successfully. Opening your dashboard...");

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-2xl font-bold text-gray-950">
              P
            </span>
            <span className="text-2xl font-bold">
              PowerTrack <span className="text-green-400">SA</span>
            </span>
          </Link>

          <h1 className="mt-7 text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-gray-400">
            Join PowerTrack SA to manage your preferred area and schedules.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl sm:p-8"
        >
          {error && (
            <div role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="rounded-lg border border-green-800 bg-green-950/50 p-3 text-sm text-green-300">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Full name
            </label>
            <input
              id="name"
              name="full_name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition placeholder:text-gray-600 focus:border-green-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition placeholder:text-gray-600 focus:border-green-500"
            />
          </div>

          <div className="relative">
            <label htmlFor="areaSearch" className="mb-2 block text-sm font-medium">
              Preferred area <span className="text-gray-500">(optional)</span>
            </label>

            <input
              id="areaSearch"
              type="text"
              autoComplete="off"
              value={areaSearch}
              onFocus={() => setShowAreaResults(true)}
              onChange={(event) => {
                setAreaSearch(event.target.value);
                setAreaId("");
                setShowAreaResults(true);
              }}
              placeholder="Search for an area"
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition placeholder:text-gray-600 focus:border-green-500"
            />

            {areaId && (
              <button
                type="button"
                onClick={() => {
                  setAreaId("");
                  setAreaSearch("");
                }}
                className="mt-2 text-xs text-green-400 hover:text-green-300"
              >
                Clear selected area
              </button>
            )}

            {showAreaResults && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
                {areasLoading ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Loading areas...</p>
                ) : areasError ? (
                  <p className="px-4 py-3 text-sm text-red-300">{areasError}</p>
                ) : filteredAreas.length > 0 ? (
                  filteredAreas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        setAreaId(String(area.id));
                        setAreaSearch(area.name);
                        setShowAreaResults(false);
                      }}
                      className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-800"
                    >
                      {area.name.replaceAll("_", " ")}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-400">
                    No matching areas found.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAreaId("");
                    setAreaSearch("");
                    setShowAreaResults(false);
                  }}
                  className="w-full border-t border-gray-800 px-4 py-3 text-left text-sm text-green-400 hover:bg-gray-800"
                >
                  Continue without an area
                </button>
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              {areasLoading
                ? "Loading available areas..."
                : areasError
                  ? "You can continue without selecting an area."
                  : "You can choose your area later from your dashboard."}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition placeholder:text-gray-600 focus:border-green-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none transition placeholder:text-gray-600 focus:border-green-500"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4 accent-green-500"
            />
            Show passwords
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-gray-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-green-400 hover:text-green-300">
              Sign in
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          PowerTrack SA — Your area. Your schedule. Stay prepared.
        </p>
      </div>
    </main>
  );
}
