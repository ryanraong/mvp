"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function TripStepNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const steps = [
    { label: "Setup", href: `/trips/${tripId}` },
    { label: "Stay plan", href: `/trips/${tripId}/stay-plan` },
    { label: "Preferences", href: `/trips/${tripId}/preferences` },
    { label: "Research", href: `/trips/${tripId}/research` },
    { label: "Sequence", href: `/trips/${tripId}/sequence` },
    { label: "Booking", href: `/trips/${tripId}/booking` },
    { label: "Coverage", href: `/trips/${tripId}/coverage` },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-4 py-2 text-sm">
      {steps.map((step) => {
        const active = pathname === step.href;
        return (
          <Link
            key={step.href}
            href={step.href}
            className={clsx(
              "rounded-full px-3 py-1 transition-colors",
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
