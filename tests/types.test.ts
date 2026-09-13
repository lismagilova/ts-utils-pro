import { expectTypeOf, it } from 'vitest';
import { createEventEmitter, debounce, deepClone, groupBy, memoize, mergeDeep, once, pipe } from '../src';
import type { FirstArgument, MyOmit, MyPartial, MyPick, MyReadonly, MyRecord, PathParts } from '../src';

it('проверяет выведенные типы', () => {
  expectTypeOf(deepClone([1, 'a'] as const)).toEqualTypeOf<readonly [1, 'a']>();
  expectTypeOf(memoize((n: number) => String(n))).toEqualTypeOf<(n: number) => string>();
  expectTypeOf(once((n: number) => n)).toEqualTypeOf<(n: number) => number>();
  expectTypeOf(debounce((n: number) => n, 1)).parameters.toEqualTypeOf<[n: number]>();
  expectTypeOf(debounce((n: number) => n, 1)).returns.toEqualTypeOf<void>();
  const merged = mergeDeep({ user: { name: 'A' } }, { user: { age: 20 } });
  expectTypeOf(merged.user.name).toEqualTypeOf<string>();
  expectTypeOf(merged.user.age).toEqualTypeOf<number>();
  expectTypeOf(pipe((n: number) => String(n), (s: string) => s.length)).toEqualTypeOf<(a: number) => number>();
  expectTypeOf<PathParts<'user.profile.name'>>().toEqualTypeOf<readonly ['user', 'profile', 'name']>();
  expectTypeOf<FirstArgument<(n: number, s: string) => void>>().toEqualTypeOf<number>();
  expectTypeOf<FirstArgument<() => void>>().toEqualTypeOf<never>();
  expectTypeOf<MyPartial<{ id: number }>>().toEqualTypeOf<{ id?: number }>();
  expectTypeOf<MyReadonly<{ id: number }>>().toEqualTypeOf<{ readonly id: number }>();
  expectTypeOf<MyPick<{ id: number; name: string }, 'id'>>().toEqualTypeOf<{ id: number }>();
  expectTypeOf<MyOmit<{ id: number; name: string }, 'id'>>().toEqualTypeOf<{ name: string }>();
  expectTypeOf<MyRecord<'a' | 'b', number>>().toEqualTypeOf<{ a: number; b: number }>();
  expectTypeOf<MyRecord<'a'>>().toEqualTypeOf<{ a: unknown }>();
});

// эта функция не запускается. tsc проверяет ожидаемые ошибки при npm run typecheck.
function invalidExamples(): void {
  // @ts-expect-error поля с несовместимыми типами
  mergeDeep({ id: 1 }, { id: 'one' });
  // @ts-expect-error несовместимость вложенных полей
  mergeDeep({ user: { id: 1 } }, { user: { id: 'one' } });
  // @ts-expect-error неправильный ключ
  groupBy([{ id: 1 }], 'name');
  // @ts-expect-error неправильный аргумент
  memoize((n: number) => n)('one');
  // @ts-expect-error неизвестное событие
  createEventEmitter<'ready'>().emit('other');
  // @ts-expect-error результат предыдущей функции не подходит следующей
  pipe((n: number) => n, (s: string) => s.length);
  const readonly: MyReadonly<{ id: number }> = { id: 1 };
  // @ts-expect-error readonly запрещает изменение
  readonly.id = 2;
  // @ts-expect-error Pick принимает только существующие ключи
  const invalid: MyPick<{ id: number }, 'missing'> = {};
  void invalid;
}
void invalidExamples;
