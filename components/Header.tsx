import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <Link href="/" className="font-semibold text-slate-900">
        Stayline <span className="font-normal text-slate-400">— hotel research &amp; selection assistant</span>
      </Link>
      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
        Demo dataset — illustrative Kyoto &amp; Osaka hotels, not live inventory
      </span>
    </header>
  );
}
