"use client";

import { Suspense } from "react";
import AssignPageInner from "./AssignPageInner";

export default function AssignPage() {
  return (
    <Suspense fallback={<main className="container">Loading…</main>}>
      <AssignPageInner />
    </Suspense>
  );
}