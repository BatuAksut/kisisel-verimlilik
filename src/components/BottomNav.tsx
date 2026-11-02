import { Link, useLocation } from 'wouter';
import { PixelIcon, type IconName } from './PixelIcon';

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Bugün', icon: 'sword' },
  { href: '/profil', label: 'Profil', icon: 'hero' },
  { href: '/ayarlar', label: 'Ayarlar', icon: 'gear' },
];

export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav
      aria-label="Ana menü"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-ink-soft pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {TABS.map((tab) => {
          const active = location === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 font-pixel text-sm active:bg-panel ${
                active ? 'bg-panel text-amber' : 'text-muted'
              }`}
            >
              {active && <span aria-hidden="true" className="absolute inset-x-3 -top-0.5 h-0.5 bg-amber" />}
              <PixelIcon key={String(active)} name={tab.icon} size={20} className={active ? 'animate-pop' : ''} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
