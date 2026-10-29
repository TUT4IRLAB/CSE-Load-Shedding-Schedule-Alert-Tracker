
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Area = {
  id: number | string;
  name: string;
  esp_area_id?: string | null;
};

type ApiResponse = {
  message?: string;
  success?: boolean;
  simulated?: boolean;
  source?: string;
  areasProcessed?: number;
  simulatedDaysPerArea?: number;
  areaDaysChecked?: number;
  noOutageAreaDays?: number;
  outageAreaDays?: number;
  schedulesGenerated?: number;
  areas?: Area[];
  area?: Area;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function readResponse(response: Response): Promise<ApiResponse> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Invalid backend response (HTTP ${response.status}). Check that your backend is running.`
    );
  }

  const data: unknown = await response.json();

  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const objectData = data as ApiResponse;

    if (!response.ok) {
      throw new Error(
        objectData.message || `Request failed with HTTP ${response.status}.`
      );
    }

    return objectData;
  }

  if (Array.isArray(data)) {
    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}.`);
    }

    return { areas: data as Area[] };
  }

  throw new Error("Unexpected response received from the backend.");
}

export default function AdminPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSchedules, setGeneratingSchedules] = useState(false);

  const [generatorResult, setGeneratorResult] =
    useState<ApiResponse | null>(null);
  const [generatorError, setGeneratorError] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const showError = (text: string) => {
    setMessageType("error");
    setMessage(text);
  };

  const showSuccess = (text: string) => {
    setMessageType("success");
    setMessage(text);
  };

  // Fetch areas from the existing backend.
  const loadAreas = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/areas`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await readResponse(response);

      if (!Array.isArray(data.areas)) {
        throw new Error(
          "The backend response did not contain an areas array."
        );
      }

      setAreas(data.areas);
      setMessage("");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load areas on the first page visit.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitialAreas() {
      try {
        const response = await fetch(`${API_URL}/api/areas`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await readResponse(response);

        if (!Array.isArray(data.areas)) {
          throw new Error(
            "The backend response did not contain an areas array."
          );
        }

        if (!controller.signal.aborted) {
          setAreas(data.areas);
          setMessage("");
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setMessageType("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not connect to the backend."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchInitialAreas();

    return () => controller.abort();
  }, []);

  // Generate simulated test schedules for all existing areas.
  async function generateTestSchedules() {
    if (areas.length === 0) {
      setGeneratorError(
        "No areas are loaded. Refresh the area list before generating test data."
      );
      return;
    }

    const confirmed = window.confirm(
      "Generate simulated test schedules for all existing areas for the next 7 days?\n\n" +
        "IMPORTANT: These are random test records, NOT real outage schedules.\n\n" +
        "Only existing records labelled SIMULATED TEST DATA - NOT REAL should be replaced."
    );

    if (!confirmed) return;

    setGeneratingSchedules(true);
    setGeneratorError("");
    setGeneratorResult(null);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/schedules/generate-test`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await readResponse(response);

      if (data.success !== true) {
        throw new Error(
          data.message || "The generator returned an unexpected response."
        );
      }

      setGeneratorResult(data);
    } catch (error) {
      setGeneratorError(
        error instanceof Error
          ? error.message
          : "Could not generate simulated schedules."
      );
    } finally {
      setGeneratingSchedules(false);
    }
  }

  // Add an area.
  async function addArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const areaName = name.trim();

    if (areaName.length < 2 || areaName.length > 150) {
      showError("Enter an area name between 2 and 150 characters.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/admin/areas`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: areaName }),
      });

      const data = await readResponse(response);

      setName("");
      showSuccess(data.message || "Area added successfully.");

      await loadAreas();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Could not add area."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(area: Area) {
    setEditingId(area.id);
    setEditingName(area.name);
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  // Update an area.
  async function updateArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingId === null) return;

    const updatedName = editingName.trim();

    if (updatedName.length < 2 || updatedName.length > 150) {
      showError("Enter an area name between 2 and 150 characters.");
      return;
    }

    const existingArea = areas.find(
      (area) => String(area.id) === String(editingId)
    );

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/areas/${encodeURIComponent(String(editingId))}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: updatedName,
            esp_area_id: existingArea?.esp_area_id ?? null,
          }),
        }
      );

      const data = await readResponse(response);

      setEditingId(null);
      setEditingName("");
      showSuccess(data.message || "Area updated successfully.");

      await loadAreas();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Could not update area."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete an area. The backend prevents deletion when schedules depend on it.
  async function deleteArea(area: Area) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${area.name}"?\n\n` +
        "This cannot be undone. The backend will prevent deletion if the area has schedules."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/areas/${encodeURIComponent(String(area.id))}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await readResponse(response);

      if (String(editingId) === String(area.id)) {
        cancelEditing();
      }

      showSuccess(data.message || "Area deleted successfully.");

      await loadAreas();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Could not delete area."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              PowerTrack SA
            </p>

            <h1 className="mt-2 text-3xl font-bold">Admin Dashboard</h1>

            <p className="mt-2 text-slate-600">
              Manage registered areas and generate simulated schedules for
              development and testing.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </header>

        {message && (
          <div
            role={messageType === "error" ? "alert" : "status"}
            className={`mb-6 rounded-lg border p-4 text-sm ${
              messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* SIMULATED SCHEDULE GENERATOR */}
        <section className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-3 text-2xl">🧪</div>

            <div>
              <h2 className="text-xl font-bold text-amber-950">
                Simulated Schedule Generator
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-900">
                Generate random example schedules for every registered area
                for the next seven days. This is a development and testing
                feature only.
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-red-300 bg-white p-4">
            <p className="font-bold text-red-700">
              TEST DATA ONLY — NOT REAL LOAD-SHEDDING INFORMATION
            </p>

            <p className="mt-1 text-sm text-slate-700">
              Generated stages and times are random examples. They do not
              represent actual Eskom or municipal schedules and must not be
              used to plan around real power outages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void generateTestSchedules()}
            disabled={generatingSchedules || loading || areas.length === 0}
            className="w-full rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {generatingSchedules
              ? "Generating simulated schedules..."
              : "Generate 7-Day Simulated Test Data"}
          </button>

          {areas.length === 0 && !loading && (
            <p className="mt-3 text-sm text-amber-900">
              No areas loaded. Refresh the list or check the backend
              connection before generating test schedules.
            </p>
          )}

          {generatorError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-300 bg-white p-4 text-sm text-red-700"
            >
              <p className="font-bold">Generation failed</p>
              <p className="mt-1">{generatorError}</p>
            </div>
          )}

          {generatorResult && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-green-300 bg-white p-5"
            >
              <h3 className="text-lg font-bold text-green-800">
                Simulated test schedules generated
              </h3>

              <p className="mt-2 text-sm text-red-700">
                These records are simulated and are not real load-shedding
                information.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ResultCard
                  label="Areas processed"
                  value={generatorResult.areasProcessed ?? 0}
                />

                <ResultCard
                  label="Days per area"
                  value={generatorResult.simulatedDaysPerArea ?? 7}
                />

                <ResultCard
                  label="Schedules generated"
                  value={generatorResult.schedulesGenerated ?? 0}
                />

                <ResultCard
                  label="Area-days with simulated outages"
                  value={generatorResult.outageAreaDays ?? 0}
                />

                <ResultCard
                  label="Area-days without simulated outages"
                  value={generatorResult.noOutageAreaDays ?? 0}
                />

                <ResultCard
                  label="Area-days checked"
                  value={generatorResult.areaDaysChecked ?? 0}
                />
              </div>

              <p className="mt-4 wrap-break-word text-xs text-slate-500">
                Database source label:{" "}
                {generatorResult.source || "SIMULATED TEST DATA - NOT REAL"}
              </p>
            </div>
          )}
        </section>

        {/* ADD AREA */}
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Add a new area</h2>

          <form onSubmit={addArea} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter area name, e.g. Centurion"
              maxLength={150}
              minLength={2}
              required
              disabled={saving}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Please wait..." : "Add Area"}
            </button>
          </form>
        </section>

        {/* MANAGE AREAS */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Manage areas</h2>

              <p className="mt-1 text-sm text-slate-500">
                {areas.length} area{areas.length === 1 ? "" : "s"} registered
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAreas()}
              disabled={loading || saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="py-6 text-slate-600">Loading areas...</p>
          ) : areas.length === 0 ? (
            <p className="py-6 text-slate-600">
              No areas found. Check the error message above or verify the
              backend response.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Area name</th>
                    <th className="px-3 py-3">ESP area ID</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {areas.map((area) => (
                    <tr key={area.id} className="border-b border-slate-100">
                      <td className="px-3 py-4">{area.id}</td>

                      <td className="px-3 py-4 font-medium">
                        {String(editingId) === String(area.id) ? (
                          <form
                            id={`edit-area-${area.id}`}
                            onSubmit={updateArea}
                          >
                            <input
                              value={editingName}
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              minLength={2}
                              maxLength={150}
                              required
                              disabled={saving}
                              autoFocus
                              aria-label={`Edit area ${area.name}`}
                              className="w-full min-w-32 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                            />
                          </form>
                        ) : (
                          area.name
                        )}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {area.esp_area_id || "Not assigned"}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {String(editingId) === String(area.id) ? (
                            <>
                              <button
                                type="submit"
                                form={`edit-area-${area.id}`}
                                disabled={saving}
                                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={saving}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(area)}
                                disabled={saving}
                                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void deleteArea(area)}
                                disabled={saving}
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
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

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-100 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
