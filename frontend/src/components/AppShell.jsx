import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { LayoutDashboard, FilePlus, Pill, LogOut, Layers, Users, PanelLeftClose, PanelLeftOpen, UserRound, Building2 } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'hc'] },
  { label: 'Patients', icon: UserRound, path: '/patients', roles: ['admin', 'hc'] },
  { label: 'New Plan', icon: FilePlus, path: '/plans/new', roles: ['admin', 'hc'] },
  { label: 'Supplements', icon: Pill, path: '/admin/supplements', roles: ['admin'] },
  { label: 'Templates', icon: Layers, path: '/admin/templates', roles: ['admin'] },
  { label: 'Companies', icon: Building2, path: '/admin/companies', roles: ['admin'] },
  { label: 'Users', icon: Users, path: '/admin/users', roles: ['admin'] },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  const filteredNav = navItems.filter(n => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-[#F7F8FA]" data-testid="app-shell">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white border-r border-[#E8ECF0] flex flex-col shrink-0 overflow-hidden shadow-[1px_0_3px_rgba(0,0,0,0.03)]"
      >
        {/* Logo */}
        <div className="h-[72px] flex items-center px-5 border-b border-[#E8ECF0] justify-between">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <img src="https://portal-drshumard.b-cdn.net/logo.png" alt="Dr. Shumard" className="h-8 w-auto object-contain flex-shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}
            className="h-9 w-9 p-0 rounded-lg text-[#94A3B8] hover:text-[#0B0D10] hover:bg-[#F1F5F9] shrink-0" data-testid="sidebar-toggle">
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-1">
          {filteredNav.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <div key={item.path} className="py-0.5">
                <button
                  onClick={() => navigate(item.path)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-[#EAF4F3] text-[#0D5F68] border-l-[3px] border-[#0D5F68] shadow-sm'
                      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] border-l-[3px] border-transparent'
                  }`}
                >
                  <item.icon size={19} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="whitespace-nowrap overflow-hidden">
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#E8ECF0] bg-[#FAFBFC]">
          <motion.div layout transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className={`flex flex-col items-center gap-2 ${collapsed ? 'py-2' : 'px-2 py-3'}`}>
            <UserButton afterSignOutUrl="/" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="w-full text-center overflow-hidden">
                  <div className="text-[13px] font-semibold truncate text-[#0B0D10]">{user?.name}</div>
                  <Badge className={`mt-1 px-2 py-0.5 text-[10px] font-bold ${
                    user?.role === 'admin' ? 'bg-[#0D5F68] text-white hover:bg-[#0D5F68]' : 'bg-[#147D5A] text-white hover:bg-[#147D5A]'
                  }`}>{user?.role === 'admin' ? 'Admin' : 'HC'}</Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
