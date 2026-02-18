"use client";

import React from "react";

type Props = {
  name: string;
  ticker: string;
  sector: string;
  setName: (v: string) => void;
  setTicker: (v: string) => void;
  setSector: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;
};

export default function CompanyForm({ name, ticker, sector, setName, setTicker, setSector, onSubmit, onCancel }: Props) {
  return (
    <form onSubmit={onSubmit} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
      <input
        className="col-span-1 sm:col-span-2 rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-200"
        placeholder="Company name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-200"
        placeholder="Ticker"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
      />
      <input
        className="rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-200"
        placeholder="Sector"
        value={sector}
        onChange={(e) => setSector(e.target.value)}
      />
      <div className="sm:col-span-4 flex gap-2">
        <button type="submit" className="rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700">
          Add
        </button>
        <button type="button" onClick={onCancel} className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </form>
  );
}
