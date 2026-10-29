
"use client";


import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Area = {
  id: string | number;
  name: string;
  esp_area_id?: string | null;
};

type User = {
  id: string | number;
  full_name: string;
  email: string;
  area_id: string | number | null;
  area_name?: string | null;
};

type Schedule = {
  id: string | number;
  stage: number | string;
  start_time: string;
  end_time: string;
  source?: string | null;
  area_name?: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingArea, setSavingArea] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSchedules = useCallback(async (areaId: string | number) => {
    const response = await fetch(
      `${API_URL}/api/schedules?area=${encodeURIComponent(String(areaId))}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load schedules.");
    }

    setSchedules(Array.isArray(data.schedules) ? data.schedules : []);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [userResponse, areasResponse] = await Promise.all([
        fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/areas`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (userResponse.status === 401) {
        router.replace("/login");
        return;
      }

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(userData.message || "Could not load your account.");
      }

      const areasData = await areasResponse.json();

      if (!areasResponse.ok) {
        throw new Error(areasData.message || "Could not load areas.");
      }

      const user: User = userData.user;
      
const availableAreas: Area[] = Array.isArray(areasData)
  ? areasData
  : Array.isArray(areasData.areas)
    ? areasData.areas
    : [];


      setCurrentUser(user);
      setAreas(availableAreas);

      const savedAreaId =
        user.area_id === null || user.area_id === undefined
          ? ""
          : String(user.area_id);

      setSelectedAreaId(savedAreaId);

      if (savedAreaId) {
        await loadSchedules(savedAreaId);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [loadSchedules, router]);

  useEffect(() => {
  const timer = setTimeout(() => {
    void loadDashboard();
  }, 0);

  return () => clearTimeout(timer);
}, [loadDashboard]);
  async function savePreferredArea() {
    if (!selectedAreaId) {
      setError("Please select an area first.");
      setSuccess("");
      return;
    }

    setSavingArea(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/auth/preferred-area`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area_id: Number(selectedAreaId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save your preferred area.");
      }

      if (data.user) {
        setCurrentUser(data.user);
      }

      await loadSchedules(selectedAreaId);

      setSuccess("Your preferred area has been saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save your area."
      );
    } finally {
      setSavingArea(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
    }
  }

  function formatDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Keep the existing upcoming-schedules time filter unchanged.
  const upcomingSchedules = schedules
    .filter(
      (schedule) =>
        new Date(schedule.end_time).getTime() > new Date().getTime()
    )
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() -
        new Date(b.start_time).getTime()
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-lg">Loading your PowerTrack dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-400">
              PowerTrack SA
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Load-shedding schedule tracker
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800"
          >
            Log out
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-200"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-200"
          >
            {success}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Welcome back</p>

          <h2 className="mt-1 text-2xl font-semibold">
            {currentUser?.full_name || "PowerTrack user"}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {currentUser?.email}
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Manage your area</h2>

          <p className="mt-2 text-sm text-slate-400">
            Choose the area you want to see load-shedding schedules for.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedAreaId}
              onChange={(event) => {
                setSelectedAreaId(event.target.value);
                setError("");
                setSuccess("");
              }}
              className="min-h-12 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
            >
              <option value="">Select an area</option>

              {areas.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.name}
                </option>
              ))}
            </select>

            <button
              onClick={savePreferredArea}
              disabled={savingArea || !selectedAreaId}
              className="min-h-12 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingArea ? "Saving..." : "Save area"}
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-400">
            Current saved area:{" "}
            <span className="font-medium text-emerald-400">
              {currentUser?.area_name ||
                areas.find(
                  (area) => String(area.id) === String(currentUser?.area_id)
                )?.name ||
                "Not selected"}
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Upcoming schedules</h2>

              <p className="mt-1 text-sm text-slate-400">
                Area:{" "}
                {areas.find(
                  (area) => String(area.id) === String(selectedAreaId)
                )?.name || "Not selected"}
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              {upcomingSchedules.length} upcoming
            </span>
          </div>

          {!selectedAreaId ? (
            <p className="mt-6 rounded-lg bg-slate-950 p-5 text-slate-400">
              Select an area and save it to view its schedules.
            </p>
          ) : upcomingSchedules.length === 0 ? (
            <p className="mt-6 rounded-lg bg-slate-950 p-5 text-slate-400">
              No upcoming schedules were found for this area. This can mean
              there are no schedule records for the selected area, or all
              its recorded schedules have ended.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {upcomingSchedules.map((schedule) => (
                <article
                  key={schedule.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      Stage {schedule.stage}
                    </h3>

                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                      Scheduled
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-slate-500">Starts</p>
                      <p className="mt-1 text-slate-200">
                        {formatDateTime(schedule.start_time)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Ends</p>
                      <p className="mt-1 text-slate-200">
                        {formatDateTime(schedule.end_time)}
                      </p>
                    </div>

                    {schedule.source && (
                      <div>
                        <p className="text-slate-500">Source</p>
                        <p className="mt-1 text-slate-300">
                          {schedule.source}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-slate-500">
          PowerTrack SA · Load-shedding information
        </footer>
      </div>
    </main>
  );
}
