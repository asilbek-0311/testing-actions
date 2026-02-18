"use client";

import React, { useEffect, useState } from "react";

type Company = {
  id: string;
  name: string;
  ticker?: string;
  sector?: string;
};

const STORAGE_KEY = "companies_dashboard_v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [sector, setSector] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCompanies(JSON.parse(raw));
      else
        setCompanies([
          { id: uid(), name: "Acme Corp", ticker: "ACM", sector: "Technology" },
          { id: uid(), name: "Globex", ticker: "GLX", sector: "Finance" },
        ]);
    } catch (e) {
      setCompanies([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    } catch (e) {
      // ignore
    }
  }, [companies]);

  function addCompany(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    const c: Company = { id: uid(), name: name.trim(), ticker: ticker.trim(), sector: sector.trim() };
    setCompanies((s) => [c, ...s]);
    setName("");
    setTicker("");
    setSector("");
    setShowForm(false);
  }

  function removeCompany(id: string) {
    setCompanies((s) => s.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Companies Dashboard</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage and view your companies at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm((s) => !s)}
              className="rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
            >
              {showForm ? "Close" : "Add Company"}
            </button>
          </div>
        </header>

        {showForm && (
          <form onSubmit={addCompany} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              className="col-span-1 sm:col-span-2 rounded-md border px-3 py-2"
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
            />
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
            <div className="sm:col-span-4">
              <button type="submit" className="rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700">
                Add
              </button>
            </div>
          </form>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4 text-zinc-800 dark:text-zinc-50">Your Companies</h2>
          {companies.length === 0 ? (
            <div className="text-zinc-600 dark:text-zinc-400">No companies yet. Add one to get started.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((c) => (
                <div key={c.id} className="rounded-lg border bg-white/80 p-4 shadow-sm dark:bg-[#0b0b0b]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{c.name}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">{c.sector || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{c.ticker || "—"}</div>
                      <button
                        onClick={() => removeCompany(c.id)}
                        className="mt-2 text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
