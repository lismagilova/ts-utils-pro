export type MyPartial<T> = { [K in keyof T]?: T[K] };
export type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
export type MyOmit<T, K extends PropertyKey> = {
  [P in keyof T as P extends K ? never : P]: T[P]
};
export type MyRecord<K extends PropertyKey, V = unknown> = { [P in K]: V };

/** превращает user.name в неизменяемый ["user", "name"] */
export type PathParts<S extends string> =
  S extends `${infer Head}.${infer Tail}`
    ? readonly [Head, ...PathParts<Tail>]
    : readonly [S];

/** достает первый аргумент функции через tuple inference */
export type FirstArgument<F> =
  F extends (...args: infer Args) => unknown
    ? Args extends [infer First, ...unknown[]] ? First : never
    : never;

export type Callable = (...args: never[]) => unknown;

/** общие поля при слиянии должны иметь совместимые типы */
export type Compatible<A, B> = {
  [K in keyof B]: K extends keyof A
    ? A[K] extends readonly unknown[]
      ? B[K] extends A[K] ? B[K] : never
      : A[K] extends object
        ? B[K] extends object ? Compatible<A[K], B[K]> : never
        : B[K] extends A[K] ? B[K] : never
    : B[K]
};
