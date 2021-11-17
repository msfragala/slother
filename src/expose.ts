import { Action } from "./thread";

interface IncomingMessage {
  id: number;
  action: Action;
}

interface Actions {
  [key: string]: (payload: any) => Promise<any>;
}

export function expose(actors: Actions) {
  self.addEventListener("message", async (event) => {
    if (!event?.data?.id) return;
    if (!event?.data?.action?.name) return;
    const { id, action } = event.data as IncomingMessage;

    if (!actors[action.name]) return;

    actors[action.name](action.payload)
      .then((payload) => {
        self.postMessage({ id, payload });
      })
      .catch((error) => {
        self.postMessage({ id, error });
      });
  });
}
