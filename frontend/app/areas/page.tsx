
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Area = {
  id: number | string;
  name: string;
  esp_area_id?: string | number | null;
};

export default function AreaManagementPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [search, setSearch] = useState("");
  const [areaName, setAreaName] = useState("");
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch areas whenever the search value changes.
  useEffect(() => {
    let cancelled = false;

    async function fetchAreas() {
      try {
        const response = await fetch(
          `${API_URL}/api/areas?search=${encodeURIComponent(search)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load areas.");
        }

        if (!cancelled) {
          setAreas(data.areas || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not connect to the server."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchAreas();

    return () => {
      cancelled = true;
    };
  }, [search]);

  // Refresh the list after an action.
  const loadAreas = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/areas?search=${encodeURIComponent(search)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load areas.");
      }

      setAreas(data.areas || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  function resetForm() {
    setAreaName("");
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = areaName.trim();

    if (!name) {
      setError("Please enter an area name.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing
          ? `${API_URL}/api/areas/${encodeURIComponent(String(editingId))}`
          : `${API_URL}/api/areas`,
        {
          method: isEditing ? "PUT" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (response.status === 401
              ? "Please sign in first."
              : response.status === 403
                ? "You do not have administrator permission."
                : "Could not save the area.")
        );
      }

      setMessage(
        isEditing
          ? "Area updated successfully."
          : "Area added successfully."
      );

      resetForm();
      await loadAreas();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(area: Area) {
    setEditingId(area.id);
    setAreaName(area.name);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(area: Area) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${area.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/areas/${encodeURIComponent(String(area.id))}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (response.status === 401
              ? "Please sign in first."
              : response.status === 403
                ? "You do not have administrator permission."
                : "Could not delete the area. It may be linked to existing records.")
        );
      }

      if (editingId === area.id) {
        resetForm();
      }

      setMessage(`"${area.name}" was deleted successfully.`);
      await loadAreas();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the area."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
              PowerTrack SA
            </p>

            <h1 className="text-3xl font-bold sm:text-4xl">
              Area Management
            </h1>

            <p className="mt-2 text-slate-400">
              Manage the suburbs and towns available in your application.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </header>

        {message && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-300"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300"
          >
            {error}

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-3 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Add or edit an area */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-semibold">
            {editingId !== null ? "Edit area" : "Add a new area"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="areaName"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Suburb or town name
              </label>

              <input
                id="areaName"
                name="areaName"
                type="text"
                value={areaName}
                onChange={(event) => setAreaName(event.target.value)}
                placeholder="e.g. Centurion"
                required
                maxLength={100}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save changes"
                    : "Add area"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-700 px-5 py-3 font-medium hover:bg-slate-800"
                >
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Search and manage areas */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Existing areas</h2>

              <p className="mt-1 text-sm text-slate-400">
                {areas.length} result{areas.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAreas()}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <label
            htmlFor="areaSearch"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Search areas
          </label>

          <input
            id="areaSearch"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by suburb or town..."
            className="mb-5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          {loading ? (
            <p className="py-8 text-center text-slate-400">
              Loading areas...
            </p>
          ) : areas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No areas found. Try another search or add a new area above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-105 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="px-3 py-3 font-medium">Area name</th>
                    <th className="px-3 py-3 font-medium">Area ID</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {areas.map((area) => (
                    <tr
                      key={area.id}
                      className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-4 font-medium">
                        {area.name}
                      </td>

                      <td className="px-3 py-4 text-slate-400">
                        {area.id}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(area)}
                            className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(area)}
                            className="rounded-md border border-red-900 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
