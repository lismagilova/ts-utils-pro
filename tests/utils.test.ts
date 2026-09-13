import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventEmitter, debounce, deepClone, groupBy, isEqual, memoize, mergeDeep, once, pipe } from '../src';

afterEach(() => vi.useRealTimers());

describe('deepClone', () => {
  it('копирует вложенные данные и Date', () => {
    const source = { list: [{ n: 1 }], date: new Date(100), empty: null };
    const copy = deepClone(source);
    expect(copy).toEqual(source);
    expect(copy).not.toBe(source);
    expect(copy.list[0]).not.toBe(source.list[0]);
    expect(copy.date).not.toBe(source.date);
    copy.list[0].n = 2;
    expect(source.list[0].n).toBe(1);
  });
  it('поддерживает примитивы, readonly и циклы', () => {
    expect(deepClone(undefined)).toBeUndefined();
    expect(deepClone(5)).toBe(5);
    expect(deepClone([1, 2] as const)).toEqual([1, 2]);
    const source: { self?: unknown } = {};
    source.self = source;
    const copy = deepClone(source);
    expect(copy.self).toBe(copy);
  });
  it('сохраняет общие ссылки и отклоняет неподдерживаемые объекты', () => {
    const child = {};
    const copy = deepClone({ a: child, b: child });
    expect(copy.a).toBe(copy.b);
    expect(() => deepClone(new Map())).toThrow(TypeError);
  });
});

describe('debounce', () => {
  it('делает один вызов с последними аргументами и this', () => {
    vi.useFakeTimers();
    const context = { n: 2 };
    const fn = vi.fn(function (this: typeof context, n: number) { return this.n + n; });
    const delayed = debounce(fn, 20);
    expect(delayed.call(context, 1)).toBeUndefined();
    vi.advanceTimersByTime(10);
    delayed.call(context, 3);
    vi.advanceTimersByTime(19);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith(3);
    expect(fn.mock.results[0].value).toBe(5);
    delayed.call(context, 4);
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('принимает ноль и отклоняет неверную задержку', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    debounce(fn, 0)();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledOnce();
    for (const delay of [-1, NaN, Infinity]) expect(() => debounce(fn, delay)).toThrow(RangeError);
  });
});

describe('memoize', () => {
  it('кеширует по всем аргументам', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const cached = memoize(fn);
    expect(cached(1, 2)).toBe(3);
    expect(cached(1, 2)).toBe(3);
    expect(cached(1, 3)).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('различает ссылки и this, кеширует undefined', () => {
    const fn = vi.fn(function (this: unknown, ..._args: unknown[]) { return undefined; });
    const cached = memoize(fn);
    const obj = {};
    cached(obj); cached(obj); cached({}); cached(); cached();
    cached.call(obj); cached.call(obj);
    expect(fn).toHaveBeenCalledTimes(4);
  });
  it('не кеширует ошибку', () => {
    const fn = vi.fn(() => { throw new Error('ошибка'); });
    const cached = memoize(fn);
    expect(cached).toThrow(); expect(cached).toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('groupBy', () => {
  it('группирует readonly-массив, включая специальные ключи', () => {
    const array = [{ role: 'user' }, { role: 'user' }, { role: '__proto__' }] as const;
    const groups = groupBy(array, 'role');
    expect(groups.user).toHaveLength(2);
    expect(groups.__proto__).toEqual([array[2]]);
    expect(array).toHaveLength(3);
    expect(Object.keys(groupBy([], 'x' as never))).toEqual([]);
  });
  it('переводит числовое значение поля в строковый ключ', () => {
    expect(groupBy([{ id: 1 }], 'id')['1']).toEqual([{ id: 1 }]);
  });
});

describe('mergeDeep', () => {
  it('сливает вложенные поля, заменяет массивы и не меняет входы', () => {
    const a = { user: { name: 'A' }, list: [1, 2] };
    const b = { user: { age: 20 }, list: [3] };
    const result = mergeDeep(a, b);
    expect(result).toEqual({ user: { name: 'A', age: 20 }, list: [3] });
    result.list.push(4);
    expect(a.list).toEqual([1, 2]); expect(b.list).toEqual([3]);
    expect(result.user).not.toBe(a.user);
  });
  it('заменяет совместимые поля и обрабатывает пустые объекты', () => {
    expect(mergeDeep({ n: 1, value: null }, { n: 2, value: null })).toEqual({ n: 2, value: null });
    expect(mergeDeep({}, {})).toEqual({});
    for (const value of [[], new Date(), new Map()]) {
      expect(() => mergeDeep(value, {})).toThrow(TypeError);
      expect(() => mergeDeep({}, value)).toThrow(TypeError);
    }
  });
  it('безопасно копирует поле __proto__', () => {
    const b: Record<string, unknown> = JSON.parse('{"__proto__":{"polluted":true}}');
    const result = mergeDeep({}, b);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(Object.hasOwn({}, 'polluted')).toBe(false);
  });
});

describe('once', () => {
  it('сохраняет первый результат и this', () => {
    const fn = vi.fn(function (this: { n: number }, x: number) { return this.n + x; });
    const run = once(fn);
    expect(run.call({ n: 2 }, 3)).toBe(5);
    expect(run.call({ n: 10 }, 10)).toBe(5);
    expect(fn).toHaveBeenCalledOnce();
  });
  it('сохраняет undefined и допускает повтор после ошибки', () => {
    const fn = vi.fn(() => undefined);
    const run = once(fn); run(); run();
    expect(fn).toHaveBeenCalledOnce();
    let attempts = 0;
    const retry = once(() => { if (++attempts === 1) throw new Error(); return 7; });
    expect(retry).toThrow(); expect(retry()).toBe(7); expect(retry()).toBe(7);
    expect(attempts).toBe(2);
  });
});

describe('isEqual', () => {
  it('сравнивает примитивы и вложенные данные', () => {
    expect(isEqual(NaN, NaN)).toBe(true);
    expect(isEqual(0, -0)).toBe(false);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(null, {})).toBe(false);
    expect(isEqual(1, '1')).toBe(false);
    expect(isEqual({ a: [1, { b: true }] }, { a: [1, { b: true }] })).toBe(true);
    expect(isEqual({ a: undefined }, { b: undefined })).toBe(false);
    expect(isEqual({}, { a: 1 })).toBe(false);
    expect(isEqual([1], [1, 2])).toBe(false);
    expect(isEqual([1], [2])).toBe(false);
    expect(isEqual([], {})).toBe(false);
  });
  it('сравнивает даты и неподдерживаемые объекты по ссылке', () => {
    expect(isEqual(new Date(1), new Date(1))).toBe(true);
    expect(isEqual(new Date(1), new Date(2))).toBe(false);
    expect(isEqual(new Map(), new Map())).toBe(false);
    const fn = () => 1;
    expect(isEqual(fn, fn)).toBe(true);
  });
});

describe('createEventEmitter', () => {
  it('подписывает, вызывает, удаляет и не дублирует обработчик', () => {
    const events = createEventEmitter<'ready' | 'done'>();
    const fn = vi.fn();
    events.emit('ready'); events.off('ready', fn);
    events.on('ready', fn); events.on('ready', fn);
    events.emit('done'); expect(fn).not.toHaveBeenCalled();
    events.emit('ready'); expect(fn).toHaveBeenCalledOnce();
    events.off('ready', fn); events.emit('ready'); expect(fn).toHaveBeenCalledOnce();
  });
  it('вызывает снимок подписчиков при удалении внутри обработчика', () => {
    const events = createEventEmitter<'x'>();
    const second = vi.fn();
    events.on('x', () => events.off('x', second));
    events.on('x', second); events.emit('x'); events.emit('x');
    expect(second).toHaveBeenCalledOnce();
  });
});

describe('pipe', () => {
  it('выполняет 1, 2 и 3 функции по порядку', () => {
    const add = (n: number) => n + 1;
    expect(pipe(add)(2)).toBe(3);
    expect(pipe(add, String)(2)).toBe('3');
    expect(pipe(add, String, (s: string) => s.length)(9)).toBe(2);
  });
  it('передает ошибки вызывающему коду', () => {
    expect(() => pipe((_n: number) => { throw new Error('ошибка'); })(1)).toThrow('ошибка');
  });
});

