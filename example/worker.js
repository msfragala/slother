import { expose } from "../src";

expose({
  hello(name) {
    return `Hello, ${name}`;
  },
});
