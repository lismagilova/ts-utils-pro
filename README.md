# ts-utils-pro

библиотека из 9 утилит на ts

## Запуск

 Node.js >= 20 

```sh
npm install
npm run check
```

`check` проверяет типы, запускает тесты и собирает библиотеку

отдельно можно выполнить `npm run typecheck`, `npm test` и `npm run build`

после сборки появляются `dist/index.js` и `dist/index.d.ts`

cборка tsup

в tsconfig включены `strict` и `declaration`

## Примеры всех функций

```ts
import {
  deepClone, debounce, memoize, groupBy, mergeDeep,
  once, isEqual, createEventEmitter, pipe
} from './dist/index.js';

const original = { user: { name: 'Аня' } };
const copy = deepClone(original);
copy.user.name = 'Оля'; // original не меняется

const printLater = debounce((text: string) => console.log(text), 300);
printLater('Первый');
printLater('Последний'); // после паузы выведется только эта строка

const square = memoize((n: number) => n * n);
square(5); // 25
square(5); // 25, берется из кеша

const groups = groupBy([{ role: 'user' }, { role: 'admin' }], 'role');
console.log(groups.user);

const merged = mergeDeep({ user: { name: 'Аня' } }, { user: { age: 20 } });
console.log(merged.user.name, merged.user.age);
// mergeDeep({ id: 1 }, { id: '1' }); // ошибка ts

const init = once(() => 'Готово');
init();
init(); // тот же результат, исходная функция больше не вызывается

isEqual({ items: [1, 2] }, { items: [1, 2] }); // true

const events = createEventEmitter<'ready' | 'close'>();
const onReady = () => console.log('Готово');
events.on('ready', onReady);
events.emit('ready');
events.off('ready', onReady);

const calculate = pipe((n: number) => n + 1, (n: number) => String(n));
calculate(2); // '3'
```

## Локальная установка

в папке библиотеки:

```sh
npm run build
npm link
```

в другом проекте:

```sh
npm link ts-utils-pro
```

после этого:

```ts
import { deepClone } from 'ts-utils-pro';
```
