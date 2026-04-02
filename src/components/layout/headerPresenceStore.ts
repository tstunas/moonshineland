"use client";

export type HeaderPresenceScope = "board" | "thread" | null;

interface HeaderPresenceSnapshot {
  scope: HeaderPresenceScope;
  count: number | null;
}

const listeners = new Set<() => void>();

let snapshot: HeaderPresenceSnapshot = {
  scope: null,
  count: null,
};

export function subscribeHeaderPresence(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getHeaderPresenceSnapshot() {
  return snapshot;
}

export function setHeaderPresence(next: HeaderPresenceSnapshot) {
  const hasScopeChanged = snapshot.scope !== next.scope;
  const hasCountChanged = snapshot.count !== next.count;

  if (!hasScopeChanged && !hasCountChanged) {
    return;
  }

  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}

export function clearHeaderPresence(scope?: Exclude<HeaderPresenceScope, null>) {
  if (scope && snapshot.scope !== scope) {
    return;
  }

  if (snapshot.scope === null && snapshot.count === null) {
    return;
  }

  snapshot = {
    scope: null,
    count: null,
  };

  for (const listener of listeners) {
    listener();
  }
}
