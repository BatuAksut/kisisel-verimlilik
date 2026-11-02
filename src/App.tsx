import { useLiveQuery } from 'dexie-react-hooks';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { BottomNav } from './components/BottomNav';
import { db } from './db/database';
import { Onboarding } from './features/onboarding/Onboarding';

export function App() {
  // null: profil yok (onboarding), undefined: veritabanı henüz okunmadı.
  const profile = useLiveQuery(async () => (await db.profile.get('me')) ?? null);

  if (profile === undefined) return null;
  if (profile === null) return <Onboarding />;

  return (
    <Router hook={useHashLocation}>
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <Switch>
          <Route path="/profil">
            <h1 className="text-2xl">Profil</h1>
          </Route>
          <Route path="/ayarlar">
            <h1 className="text-2xl">Ayarlar</h1>
          </Route>
          <Route>
            <h1 className="text-2xl">Quest66</h1>
          </Route>
        </Switch>
      </main>
      <BottomNav />
    </Router>
  );
}
