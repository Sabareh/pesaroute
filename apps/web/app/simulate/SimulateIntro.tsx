"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "../learn/ui";

const SEEN_KEY = "pesaroute_sim_intro_seen";

const STEPS = [
  "Practise before using real money - every figure here is an educational estimate.",
  "Choose real Kenyan products or generic categories to explore.",
  "Rates always show their source and freshness; missing rates use a custom educational rate.",
  "Save your reasoning to your private journal.",
  "Ask a verified professional when you need to."
];

export function SimulateIntro() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/simulate/virtual-portfolio"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-textPrimary transition hover:border-borderStrong hover:bg-surfaceSubtle"
        >
          Build a what-if portfolio
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-accent underline"
        >
          How the simulator works
        </button>
      </div>

      <Modal open={open} onClose={close}>
        <p className="text-xs font-semibold uppercase text-textTertiary">PesaRoute simulator</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-textPrimary">Practise before using real money</h2>
        <ol className="mt-4 space-y-2 text-sm text-textSecondary">
          {STEPS.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-lg border border-border bg-surfaceSubtle px-4 py-3 text-xs leading-5 text-textTertiary">
          PesaRoute does not hold money, execute investments, or promise returns. Verify rates with the provider or
          regulator before committing real money.
        </p>
        <button
          type="button"
          onClick={close}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primaryDark"
        >
          Start exploring
        </button>
      </Modal>
    </>
  );
}
