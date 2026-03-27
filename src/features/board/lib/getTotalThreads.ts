export function getTotalThreads(boardKey: string): Promise<number> {
  if (boardKey !== "anchor") {
    return Promise.resolve(0);
  }

  return Promise.resolve(101);
}