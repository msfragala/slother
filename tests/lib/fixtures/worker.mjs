import '../setup/worker-thread.mjs';
import { expose } from '../../../dist/slother.mjs';

expose({
  hello(name) {
    return `Hello, ${name}`;
  },
  sleep(duration) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  },
  error() {
    throw new Error('Fake error');
  },
});
