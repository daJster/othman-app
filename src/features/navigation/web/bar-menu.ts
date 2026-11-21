import { create } from 'zustand';

/**
 * Which popover in the web bar is open, if any.
 *
 * The dropdown primitive cannot be controlled: its `Root` keeps `open` in its
 * own `useState` and only *forwards* `onOpenChange`, so a parent cannot close
 * it. What a parent can do is observe it — which is what this store is for.
 *
 * It exists because the bar's controls must be mutually exclusive without cost
 * to the visitor. Radix closes a menu through the full-viewport overlay it
 * installs, and that overlay (plus the `pointer-events: none` it puts on
 * `<body>`) is also what made the other triggers dead to the pointer: moving
 * from one menu to another took two clicks, one to dismiss and one to open.
 * The overlay is transparent now, so the dismissal needs an owner — this store
 * names the open menu, and `useExclusiveBarMenu` closes it before the next
 * trigger's press completes.
 */
export type BarMenuId = 'account' | 'theme' | 'language' | 'notices';

/** The test id of each control's trigger, so the bar can recognise a press. */
export const BAR_MENU_TRIGGER: Record<BarMenuId, string> = {
  account: 'nav-menu-trigger',
  theme: 'nav-theme-trigger',
  language: 'nav-language-trigger',
  notices: 'notices-bell-bar',
};

const TRIGGER_SELECTOR = Object.values(BAR_MENU_TRIGGER)
  .map((id) => `[data-testid="${id}"]`)
  .join(', ');

type BarMenuState = {
  open: BarMenuId | null;
  setOpen: (id: BarMenuId | null) => void;
};

export const useBarMenu = create<BarMenuState>((set) => ({
  open: null,
  setOpen: (open) => set({ open }),
}));

/**
 * Report one control's open state to the store.
 *
 * Returns the single prop the primitive understands, so a caller stays
 * declarative: `<DropdownMenu {...useExclusiveBarMenu('theme')}>`.
 */
export function useExclusiveBarMenu(id: BarMenuId) {
  const setOpen = useBarMenu((state) => state.setOpen);

  return {
    onOpenChange: (next: boolean) => setOpen(next ? id : null),
  };
}

/**
 * Close the open bar menu with the one signal the primitive does honour.
 *
 * Radix listens for Escape on the document, so a synthetic keydown closes the
 * menu exactly as the keyboard would. It runs on the capture phase of the next
 * pointer-down, before the new trigger's own handler, so one press both closes
 * the old menu and opens the new one.
 */
export function closeOpenBarMenuOnPress(event: Event) {
  const { open, setOpen } = useBarMenu.getState();

  if (!open) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const trigger = target.closest(TRIGGER_SELECTOR);
  const pressed = trigger?.getAttribute('data-testid');

  if (!pressed || pressed === BAR_MENU_TRIGGER[open]) {
    return;
  }

  setOpen(null);
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
}
