import { Pool, Thread } from "../src";

const thread = new Pool(
  () => new Worker(new URL("./worker.js", import.meta.url), { type: "module" })
);

const names = [
  "Olivia",
  "Emma",
  "Ava",
  "Charlotte",
  "Sophia",
  "Amelia",
  "Isabella",
  "Mia",
  "Evelyn",
  "Harper",
  "Camila",
  "Gianna",
  "Abigail",
  "Luna",
  "Ella",
  "Elizabeth",
  "Sofia",
  "Emily",
  "Avery",
  "Mila",
  "Scarlett",
  "Eleanor",
  "Madison",
  "Layla",
  "Penelope",
  "Aria",
  "Chloe",
  "Grace",
];

window.run = () => {
  names.forEach((name) => {
    thread
      .dispatch({
        type: "hello",
        payload: name,
      })
      .then(console.log);
  });
};
