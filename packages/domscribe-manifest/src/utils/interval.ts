export async function* interval(ms: number) {
  let tick = 0;
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, ms));
    yield tick++;
  }
}
