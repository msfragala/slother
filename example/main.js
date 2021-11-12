import { Thread } from "../src";

const thread = new Thread(
  () => new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
  { concurrency: 10 }
);

[
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
].forEach((name) => {
  thread
    .dispatch({
      type: "hello",
      payload: name,
    })
    .then(console.log);
});
