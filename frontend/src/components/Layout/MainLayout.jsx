import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS, getUserPermissions, getVisibleNavItems } from '../../config/navigation';
import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userPermissions = useMemo(() => getUserPermissions(user), [user]);
  const navItems = useMemo(() => getVisibleNavItems(userPermissions), [userPermissions]);

  const activeItem = useMemo(() => {
    const visibleMatch = navItems.find((item) => item.path === location.pathname);
    if (visibleMatch) {
      return visibleMatch;
    }

    return NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];
  }, [location.pathname, navItems]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const subtitle = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    ? `Signed in as ${user?.firstName || ''} ${user?.lastName || ''} (${user?.role || 'user'})`
    : 'School Management System';

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar
        user={user}
        items={navItems}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={`min-h-screen transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        <Header
          title={activeItem?.title || 'Dashboard'}
          subtitle={subtitle}
          collapsed={collapsed}
          onOpenMobile={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((previous) => !previous)}
          onSignOut={logout}
        />

        <main className="px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
