import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { LayoutDashboard, FilePlus, Pill, LogOut, Layers, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'hc'] },
  { label: 'New Plan', icon: FilePlus, path: '/plans/new', roles: ['admin', 'hc'] },
  { label: 'Supplements', icon: Pill, path: '/admin/supplements', roles: ['admin'] },
  { label: 'Templates', icon: Layers, path: '/admin/templates', roles: ['admin'] },
  { label: 'Users', icon: Users, path: '/admin/users', roles: ['admin'] },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter(n => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-[#F4F5F5]" data-testid="app-shell">
      {/* Left Navigation */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white border-r border-border/60 flex flex-col shrink-0 overflow-hidden"
      >
        {/* Logo */}
        <div className="h-[84px] flex items-center px-5 border-b border-border/40 justify-between">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <img src="https://portal-drshumard.b-cdn.net/logo.png" alt="Dr. Shumard" className="h-8 w-auto object-contain flex-shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-[#0B0D10] hover:bg-[#F4F5F5] shrink-0"
            data-testid="sidebar-toggle"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {filteredNav.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <div key={item.path} className="py-1">
                <button
                  onClick={() => navigate(item.path)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-2.5'
                  } ${
                    active
                      ? 'bg-[hsl(174,35%,93%)] text-[hsl(187,79%,23%)] shadow-sm'
                      : 'text-[#61746E] hover:bg-[#F4F5F5] hover:text-[#2B3437]'
                  }`}
                >
                  <item.icon size={20} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border/40">
          <div className={`flex items-center gap-3 px-3 py-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-[hsl(174,35%,93%)] flex items-center justify-center text-sm font-bold text-[hsl(187,79%,23%)] shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <div className="text-sm font-semibold truncate text-[#0B0D10]">{user?.name}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{user?.role}</div>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="logout-button"
              title="Sign out"
              className={`h-9 w-9 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 ${collapsed ? '' : ''}`}
            >
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
