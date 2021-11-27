# Slother 🦥
Lazy multi-threading for the web ✨


### Features
- 🦥 Lazy-loads workers only once needed
- 🧵 Pool API spawns new workers to scale concurrency
- ✨ Proxy API makes using workers easier
- 👍 Supports ESM, CJS, and TypeScript
- 🔥 Written in TypeScript

## Installation
```
npm install --save slother
```
```
yarn add slother
```
```
pnpm add slother
```

## Usage

**worker.js**

```js
import { expose } from 'slother';

expose({
  async add(numbers) {
    return numbers.reduce((sum, number) => sum + number);
  },
  multiply(numbers) {
    return numbers.reduce((product, number) => product * number);
  },
});
```

**main.js**

```js
import { Thread, Pool } from 'slother';

// Threads lazily spawn only a single worker. They are good when
// you need to handle only a few slow tasks or several quick tasks concurrently
const thread = new Thread(() => new Worker('./worker.js'));
const six = await thread.postMessage({ name: 'add', payload: [1, 2, 3] });

// Pools lazily spawn new threads as needed (up to 12 by default).
// They are good when you need to handle a high amount of
// (either slow or quick) tasks concurrently
const pool = new Pool(() => new Worker('./worker.js'));
const five = await pool.postMessage({ name: 'add', payload: [2, 3] });
```

### Proxy API
```js
import { Thread, Pool } from 'slother';

// Thread.proxy passes its arguments to the Thread constructor
// so accepts the same parameters
const thread = Thread.proxy(() => new Worker('./worker.js'));

// Now you can avoid calling postMessage directly with an action object
// and just call arbitrary methods on the thread proxy
const six = await thread.add([1, 2, 3]);

// The only reserved name is "self"
// which exposes the underlying Thread instance
const three = await thread.self.postMessage({ name: 'add', payload: [1, 2] });

// The same all works for Pool too
const pool = Pool.proxy(() => new Worker('./worker.js'));
const four = await pool.add([1, 1, 2]);
const two = await pool.self.postMessage( name: 'add', payload: [1, 1] });
```
