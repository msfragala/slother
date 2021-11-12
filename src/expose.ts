export function expose(actors: { [key: string]: Function }) {
  self.addEventListener("message", (event) => {
    if (!event?.data?.id) return;

    const { id, type, payload } = event.data;

    if (!actors[type]) return;

    try {
      Promise.resolve(actors[type](payload)).then((result) => {
        self.postMessage({ id, payload: result });
      });
    } catch (error) {
      self.postMessage({ id, error });
    }
  });
}

expose({
  a(a: number): number {
    return 1 + a;
  },
});
