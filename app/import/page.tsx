"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { mapCsvRowsToRides, parseCsvText, CsvMapping, CsvRow } from "@/lib/csv";

const guessColumn = (headers: string[], keywords: string[]) => {
  return headers.find((header) =>
    keywords.some((keyword) => header.toLowerCase().includes(keyword))
  );
};

export default function ImportPage() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(5);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsvText(text);
    setRows(parsed.rows);
    setHeaders(parsed.headers);
    const autoMapping: CsvMapping = {
      date:
        guessColumn(parsed.headers, ["date", "start", "time"]) ?? parsed.headers[0],
      duration: guessColumn(parsed.headers, ["duration", "elapsed", "time"]) ??
        parsed.headers[1],
      distance: guessColumn(parsed.headers, ["distance", "meter"]) ?? parsed.headers[2],
      elevation: guessColumn(parsed.headers, ["elev", "gain", "altitude"]),
      name: guessColumn(parsed.headers, ["name", "activity", "title"]),
      avgSpeed: guessColumn(parsed.headers, ["speed", "avg"]),
      effort: guessColumn(parsed.headers, ["effort", "intensity"])
    };
    setMapping(autoMapping);
  };

  const preview = useMemo(() => rows.slice(0, previewCount), [rows, previewCount]);

  const mappedPreview = useMemo(() => {
    if (!mapping) return [];
    return mapCsvRowsToRides(preview, mapping);
  }, [mapping, preview]);

  const handleImport = async () => {
    if (!mapping?.date || !mapping?.duration || !mapping?.distance) {
      setStatus("Map date, duration, and distance columns before importing.");
      return;
    }
    setStatus("Importing...");
    const rides = mapCsvRowsToRides(rows, mapping);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rides })
    });

    if (response.ok) {
      const data = await response.json();
      setStatus(`Imported ${data.created} rides. Skipped ${data.skipped} duplicates.`);
    } else {
      setStatus("Import failed.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <h2 className="section-title">Import rides CSV</h2>
        <p className="mt-2 text-sm text-slate-600">
          CSV values are treated as raw SI (meters, seconds). We convert for display.
        </p>
        <div className="mt-4">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6">
            <h3 className="section-title">Column mapping</h3>
            <p className="text-sm text-slate-500">Map CSV columns to expected fields.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(
                [
                  ["date", "Start date/time"],
                  ["duration", "Duration (seconds or HH:MM:SS)"],
                  ["distance", "Distance (meters)"],
                  ["elevation", "Elevation (meters)", true],
                  ["avgSpeed", "Avg speed (m/s)", true],
                  ["name", "Activity name", true],
                  ["effort", "Effort", true]
                ] as [keyof CsvMapping, string, boolean?][]
              ).map(([key, label, optional]) => (
                <label key={key} className="text-sm text-slate-600">
                  <span className="label">
                    {label} {optional ? "(optional)" : ""}
                  </span>
                  <select
                    className="input"
                    value={(mapping?.[key] as string | undefined) ?? ""}
                    onChange={(event) =>
                      setMapping((prev) => ({
                        ...(prev ?? ({} as CsvMapping)),
                        [key]: event.target.value
                      }))
                    }
                  >
                    <option value="">Select column</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Previewing {preview.length} of {rows.length} rows.
              </div>
              <button className="button-primary" type="button" onClick={handleImport}>
                Import rides
              </button>
            </div>
            {status ? <p className="mt-3 text-xs text-slate-500">{status}</p> : null}
          </div>

          <div className="card p-6">
            <h3 className="section-title">Preview</h3>
            <div className="mt-4 space-y-3 text-xs text-slate-600">
              {mappedPreview.length ? (
                mappedPreview.map((ride, index) => (
                  <div key={index} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="font-semibold text-slate-900">{ride.activityName ?? "Ride"}</p>
                    <p>Start: {new Date(ride.startTime).toLocaleString()}</p>
                    <p>
                      Duration: {ride.durationSeconds}s | Distance: {ride.distanceM} m
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm">Map columns to preview rides.</p>
              )}
            </div>
            <div className="mt-4">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setPreviewCount(previewCount + 5)}
              >
                Show more
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Upload a CSV to get started"
          detail="We will preview your data and ask you to map columns if needed."
        />
      )}
    </div>
  );
}
