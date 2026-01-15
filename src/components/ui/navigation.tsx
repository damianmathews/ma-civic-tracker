'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  Users,
  Calendar,
  Bell,
  Home,
  Baby,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/boston', label: 'Boston', icon: Building2 },
  { href: '/massachusetts', label: 'MA State', icon: DollarSign },
  { href: '/childcare', label: 'Childcare', icon: Baby },
  { href: '/alerts', label: 'Fraud Detection', icon: AlertTriangle },
  { href: '/representatives', label: 'Reps', icon: Users },
  { href: '/meetings', label: 'Meetings', icon: Calendar },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">
                MA Civic Tracker
              </span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t border-slate-200 md:hidden">
        <div className="grid grid-cols-3 gap-1 p-2">
          {navItems.slice(0, 6).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
