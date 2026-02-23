import React from 'react';
import { NavLink } from 'react-router-dom';
import { HiOutlineX } from 'react-icons/hi';

export default function Sidebar({
  user,
  items,
  collapsed,
  mobileOpen,
  onCloseMobile,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px] md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 shadow-xl transition-all duration-300 md:translate-x-0 ${
          collapsed ? 'md:w-20' : 'md:w-72'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white">
              SM
            </div>
            <div className={collapsed ? 'md:hidden' : ''}>
              <p className="text-sm font-semibold leading-none">School Manager</p>
              <p className="mt-1 text-xs text-slate-400">Master Navigation</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.title}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    collapsed ? 'md:justify-center md:px-2' : ''
                  } ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={collapsed ? 'md:hidden' : ''}>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-4">
          <div className={`rounded-xl bg-slate-800/60 px-3 py-2 ${collapsed ? 'md:text-center' : ''}`}>
            <p className={`text-xs text-slate-400 ${collapsed ? 'md:hidden' : ''}`}>Signed in as</p>
            <p className="truncate text-sm font-medium text-white" title={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}>
              {collapsed
                ? `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`
                : `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
            </p>
            {!collapsed && <p className="mt-0.5 truncate text-xs lowercase text-slate-400">{user?.role || 'role'}</p>}
          </div>
        </div>
      </aside>
    </>
  );
}
