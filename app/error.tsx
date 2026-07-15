"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="state-page" role="alert">
      <div className="state-icon"><AlertTriangle size={22} /></div>
      <p className="eyebrow">Data unavailable</p>
      <h1>The radar could not load this session.</h1>
      <p>No fixture or stale session has been substituted. Check the server configuration or try again shortly.</p>
      <button className="primary-button" onClick={reset} type="button">
        <RotateCcw size={15} /> Try again
      </button>
    </main>
  );
}
