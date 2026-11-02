import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { BottomNav } from './components/BottomNav';
import { db } from './db/database';
import type { Profile } from './domain/types';
import { Onboarding } from './features/onboarding/Onboarding';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { TodayScreen } from './features/today/TodayScreen';
import { useTodayNumber } from './features/useProgram';

/** Sekme değişince yeni ekran en üstten başlar, tarayıcı gibi eski kaydırma konumunda kalmaz. */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Game({ profile }: { profile: Profile }) {
  const todayNumber = useTodayNumber(profile);
  return (
    <Router hook={useHashLocation}>
      <ScrollToTop />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
        <Switch>
          <Route path="/profil">
            <ProfileScreen profile={profile} todayNumber={todayNumber} />
          </Route>
          <Route path="/ayarlar">
            <SettingsScreen profile={profile} />
          </Route>
          <Route>
            <TodayScreen profile={profile} todayNumber={todayNumber} />
          </Route>
        </Switch>
      </main>
      <BottomNav />
    </Router>
  );
}

export function App() {
  // null: profil yok (onboarding), undefined: veritabanı henüz okunmadı.
  const profile = useLiveQuery(async () => (await db.profile.get('me')) ?? null);

  if (profile === undefined) return null;
  if (profile === null) return <Onboarding />;
  return <Game profile={profile} />;
}
