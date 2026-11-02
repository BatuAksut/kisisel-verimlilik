// Chrome'un kurulum olayı sayfa açılır açılmaz gelebilir, bu yüzden React'ten önce dinlenir.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  installed = true;
  deferred = null;
  notify();
});

export const installStatus = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  canPrompt: () => deferred !== null,
  isInstalled: () => installed || window.matchMedia('(display-mode: standalone)').matches,
};

export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const event = deferred;
  deferred = null;
  await event.prompt();
  notify();
}
