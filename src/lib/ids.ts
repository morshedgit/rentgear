// Short, sortable-ish unique ids for new records. Not cryptographic — just
// enough to avoid collisions in the demo store.
export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}
