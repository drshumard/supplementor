import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { LayoutDashboard, FilePlus, Pill, Settings, LogOut, Layers, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

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

  const filteredNav = navItems.filter(n => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-[#F4F5F5]" data-testid="app-shell">
      {/* Left Navigation */}
      <aside className="w-[260px] bg-white border-r border-border/60 flex flex-col shrink-0">
        <div className="h-[84px] flex items-center px-7 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[hsl(187,79%,23%)] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <div className="text-base font-bold tracking-[-0.01em] text-[#0B0D10]">Clarity</div>
              <div className="text-[11px] text-muted-foreground tracking-wide uppercase">Protocol Manager</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-3">
          {filteredNav.map(item => {
            const active = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[hsl(174,35%,93%)] text-[hsl(187,79%,23%)] shadow-sm'
                    : 'text-[#61746E] hover:bg-[#F4F5F5] hover:text-[#2B3437]'
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <div className="w-11 h-11 rounded-full bg-[hsl(174,35%,93%)] flex items-center justify-center text-sm font-bold text-[hsl(187,79%,23%)]">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-[#0B0D10]">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{user?.role}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="logout-button"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
            >
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
