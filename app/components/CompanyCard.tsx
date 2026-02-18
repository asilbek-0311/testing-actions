"use client";

import React from "react";

type Props = {
  id: string;
  name: string;
  ticker?: string;
  sector?: string;
  onRemove: (id: string) => void;
};

export default function CompanyCard({ id, name, ticker, sector, onRemove }: Props) {
  return (
    <div className="rounded-lg border bg-white/80 p-4 shadow-sm hover:shadow-md transition-shadow dark:bg-[#071014]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{name}</div>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{sector || "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{ticker || "—"}</div>
          <button
            onClick={() => onRemove(id)}
            className="mt-2 text-xs text-red-600 hover:underline"
            aria-label={`Remove ${name}`}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
