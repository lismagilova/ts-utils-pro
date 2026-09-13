import type { Callable, Compatible } from './types'
export type { MyPartial, MyReadonly, MyPick, MyOmit, MyRecord, PathParts, FirstArgument } from './types';

type DataObject = Record<string, unknown>;
function isObject(value: unknown): value is DataObject {
  return value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** копирует обычные объекты, массивы и дату, в тч циклические ссылки */
export function deepClone<T>(obj: T): T {
  const visited = new WeakMap<object, unknown>();
  function clone(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value
    if (visited.has(value)) return visited.get(value);
    if (value instanceof Date) {
      const result = new Date(value.getTime());
      visited.set(value, result);
      return result;
    }
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      visited.set(value, result);
      for (const item of value) result.push(clone(item));
      return result;
    }
    if (!isObject(value)) throw new TypeError('только обычные объекты, массивы и дата')
    const result: DataObject = Object.create(Object.getPrototypeOf(value));
    visited.set(value, result);
    for (const key of Object.keys(value)) {
      Object.defineProperty(result, key, { value: clone(value[key]), enumerable: true, writable: true, configurable: true });
    }
    return result
  }
  return clone(obj) as T;
}

/** вызывает функцию после паузы, вызов возвращает void */
export function debounce<F extends Callable>(fn: F, delay: number):
  (this: ThisParameterType<F>, ...args: Parameters<F>) => void {
  if (!Number.isFinite(delay) || delay < 0) throw new RangeError('не сработало');
  let timer: ReturnType<typeof setTimeout> | undefined
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    clearTimeout(timer);
    timer = setTimeout(() => { fn.apply(this, args) }, delay);
  };
}

/** запоминает результат по аргументам и this- объекты сравниваются по ссылке */
export function memoize<F extends Callable>(fn: F): F {
  const cache: { args: Parameters<F>; context: unknown; result: unknown }[] = [];
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): unknown {
    const entry = cache.find(item => Object.is(item.context, this) &&
      item.args.length === args.length && item.args.every((arg, i) => Object.is(arg, args[i])));
    if (entry) return entry.result
    const result = fn.apply(this, args);
    cache.push({ args, context: this, result });
    return result;
  } as F;
}

/** группирует элементы по полю, в тч readonly-массив */
export function groupBy<T extends object>(array: readonly T[], key: keyof T): Record<string, T[]> {
  const result: Record<string, T[]> = Object.create(null);
  for (const item of array) {
    const group = String(item[key]);
    (result[group] ??= []).push(item);
  }
  return result;
}

/** рекурсивно объединяет обычные объекты, массивы заменяются, входы остаются */
export function mergeDeep<A extends object, B extends object>(a: A, b: B & Compatible<A, B>): A & B {
  assertObject(a)
  assertObject(b)
  const result = deepClone(a) as DataObject;
  const source: DataObject = b;
  for (const key of Object.keys(source)) {
    const left = result[key]
    const right = source[key];
    const value = isObject(left) && isObject(right) ? mergeDeep(left, right) : deepClone(right);
    Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true });
  }
  return result as A & B
}

/** сохраняет результат первого успешного вызова и после ошибки можно повторить */
export function once<F extends Callable>(fn: F): F {
  let called = false;
  let result: unknown;
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): unknown {
    if (!called) {
      result = fn.apply(this, args);
      called = true;
    }
    return result
  } as F;
}

/** сравнивает примитивы, массивы, дату и обычные объекты без циклов */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return Object.is(a.getTime(), b.getTime());
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => isEqual(value, b[i]));
  }
  if (!isObject(a) || !isObject(b)) return false;
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length &&
    keys.every(key => Object.hasOwn(b, key) && isEqual(a[key], b[key]));
}

/** создает ивенты с проверкой имен, данные в ивентах не передаются */
export function createEventEmitter<T extends string = string>() {
  const listeners = new Map<T, Set<() => void>>();
  return {
    on(event: T, listener: () => void): void {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },
    emit(event: T): void {
      for (const listener of [...(listeners.get(event) ?? [])]) listener();
    },
    off(event: T, listener: () => void): void {
      listeners.get(event)?.delete(listener);
    }
  }
}

/** соединяет от 1 до 3 функций слева направо с проверкой типов */
export function pipe<A, B>(ab: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (a: A) => D;
export function pipe(...functions: Callable[]): (value: unknown) => unknown {
  return (value: unknown): unknown => functions.reduce(
    (result, fn) => (fn as (input: unknown) => unknown)(result), value);
}

/** проверяет обычный объект перед слиянием и сужает его тип */
function assertObject(value: unknown): asserts value is DataObject {
  if (!isObject(value)) throw new TypeError('только обычные объекты')
}
