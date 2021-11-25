export function repeat(number, fn) {
  if (fn.constructor.name === 'AsyncFunction') {
    return asyncRepeat(number, fn);
  }

  for (let i = 0; i < number; i++) {
    fn(i + 1);
  }
}

export async function asyncRepeat(number, fn) {
  for (let i = 0; i < number; i++) {
    await fn(i + 1);
  }
}
