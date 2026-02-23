import React from 'react';
import { HiMenuAlt2, HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from 'react-icons/hi';

export default function Header({
  title,
  subtitle,
  collapsed,
  onOpenMobile,
  onToggleCollapse,
  onSignOut,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 md:hidden"
            aria-label="Open sidebar"
          >
            <HiMenuAlt2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 md:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <HiOutlineChevronDoubleRight className="h-5 w-5" /> : <HiOutlineChevronDoubleLeft className="h-5 w-5" />}
          </button>

          <div>
            <h1 className="text-lg font-semibold text-slate-900 md:text-xl">{title}</h1>
            <p className="mt-0.5 text-xs text-slate-500 md:text-sm">{subtitle}</p>
          </div>
        </div>

        <button type="button" onClick={onSignOut} className="btn-danger">
          Sign Out
        </button>
      </div>
    </header>
  );
}
