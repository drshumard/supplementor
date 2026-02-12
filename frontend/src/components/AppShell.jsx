import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { LayoutDashboard, FilePlus, Pill, Settings, LogOut, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'hc'] },
  { label: 'New Plan', icon: FilePlus, path: '/plans/new', roles: ['admin', 'hc'] },
  { label: 'Supplements', icon: Pill, path: '/admin/supplements', roles: ['admin'] },
  { label: 'Templates', icon: Layers, path: '/admin/templates', roles: ['admin'] },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNav = navItems.filter(n => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-[#F6F7F7]" data-testid="app-shell">
      {/* Left Navigation */}
      <aside className="w-[240px] bg-white border-r border-border/70 flex flex-col shrink-0">
        <div className="h-[72px] flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(187,79%,23%)] flex items-center justify-center">
              <span className="text-white font-semibold text-sm">C</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[-0.01em] text-[#0B0D10]">Clarity</div>
              <div className="text-[10px] text-muted-foreground tracking-wide uppercase">Protocol Manager</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {filteredNav.map(item => {
            const active = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[hsl(174,35%,93%)] text-[hsl(187,79%,23%)]'
                    : 'text-[#61746E] hover:bg-[#F6F7F7] hover:text-[#2B3437]'
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[hsl(174,35%,93%)] flex items-center justify-center text-sm font-semibold text-[hsl(187,79%,23%)]">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-[#0B0D10]">{user?.name}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{user?.role}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="logout-button"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <LogOut size={16} />
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
