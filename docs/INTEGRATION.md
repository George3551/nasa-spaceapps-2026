# AEGIS — integration foundation

**Historical foundation document.** Core v2 now implements the modules below
with a single developer and preserves this shell architecture. See CORE_V2.md
for current orchestration, role contexts, provenance separation and persistence.

Статус: оболочка и проверка контрактов; медицинский движок, симулятор,
корабль, камера и анатомия пока не реализованы. Исходные `contracts/types.ts`
сохранены без изменений. Это документ для четырёх разработчиков и интегратора.

## Запуск и проверки

Node.js 22.13+ (ветка 22), 24 или 26+. Проверенная локальная версия: 22.19.0.

```sh
npm install
npm run dev
npm run check
```

При воспроизведении зафиксированного окружения и в CI используйте `npm ci`.
`npm run check` запускает ESLint, Vitest, строгую проверку TypeScript и сборку.
Отдельно доступны `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
`npm run preview` раздаёт `dist/` после сборки. Команды выполняются из корня.

## Где находится основа

- `src/main.tsx`: один React root, StrictMode, AppProvider.
- `src/app/App.tsx`: навигация и слоты представлений.
- `src/app/state/`: единственное состояние миссии и UI; React Context + reducer.
- `src/app/integration/fixtures.ts`: временные синтетические данные интегратора.
- `src/app/integration/interfaces.ts`: типизированные props для подключения UI.
- `src/app/components/`: временные компоненты оболочки, не health engine.
- `src/app/views/`: интеграционные страницы и пустые состояния.
- `src/app/styles.css`: Tailwind v4 через Vite + общие токены и стили оболочки.
- `contracts/types.ts`: единственные определения доменных записей и портов.

Context + reducer достаточны для этой основы: нет второго store, скрытого
синглтона, внешней шины, backend или сетевого API. UI-состояние отделено от
канонического `MissionState`. Не создавайте локальные копии миссии в модулях.

## Подключение UI

Модули принимают props из `interfaces.ts` и возвращают React-компоненты.
Они не импортируют Context или reducer приложения. App связывает callbacks
с действиями общего store. Значения mission рассматриваются как immutable;
`Readonly` защищает верхний уровень, вложенные массивы также нельзя мутировать.

Пример будущего подключения интегратором в `src/main.tsx`:

```tsx
<AppProvider>
  <App modules={{ spacecraft: MissionView, health: HealthView,
    simulation: SimulationView, anatomy: AnatomyView, vision: VisionView }} />
</AppProvider>
```

Имена компонентов выше — пример будущих экспортов. Пока `App` работает без
`modules`: показывает fixture и честно обозначенные заглушки. Удаляйте временные
fixture-компоненты только после подключения реальных модулей.

| Модуль | UI-контракт | Вход и обратная связь |
|---|---|---|
| Mission | `MissionViewProps` | MissionState, выбранные crew/room; callbacks выбора |
| Health | `HealthViewProps` | MissionState + astronautId; HealthMeasurement и acknowledgement |
| Simulation | `SimulationViewProps` | MissionState; новый immutable MissionState |
| Anatomy | `AnatomyViewProps` | MissionState + astronautId; только представление |
| Vision | `VisionViewProps` | выбранный astronautId; ActivityRecord по завершении сеанса |

Выбор человека из корабля открывает Crew Health. Без выбранного человека
`astronautId=null`: UI должен показать отсутствие выбора, а CV — запретить старт.
Камера должна останавливаться при Stop, смене человека и размонтировании.
Fallback не должен незаметно подменять отказ камеры синтетическими данными.

## Подключение сервисов на следующем этапе

`ModuleServices` описывает зависимости интегратора через существующие
`SimulationPort`, `HealthEvaluatorPort`, `VisionPort`. Сейчас это типы будущего
подключения: оболочка не запускает эти сервисы и не содержит таймера.

1. Simulation предоставляет `initialState`, `step`, `runScenario`, `reset`.
2. Интегратор добавит один контроллер часов. Он вызывает step, учитывая paused
   и speed, затем evaluate на полученном снимке. Не создавать таймер в каждом UI.
3. Health предоставляет чистый `evaluate(state): HealthAlert[]`. Интегратор
   объединяет результат с acknowledged-состоянием перед публикацией снимка.
4. После ручного ввода/CV интегратор также должен запускать evaluate. Текущий
   callback только сохраняет запись; медицинского анализа пока нет.
5. Vision предоставляет `start`, `stop`, `onActivityRecord`; интегратор/контейнер
   управляет подпиской и её освобождением. Не запускать камеру при загрузке.

Полная orchestration откладывается до появления реализаций портов и их тестов.
Никакие правила или значения fixture не являются медицинскими порогами.

## Действия store

`navigate`, `crew/select`, `compartment/select` управляют оболочкой.
`mission/replace` принимает полный снимок и восстанавливает допустимый выбор.
`measurements/upsert`, `environment/upsert`, `activities/upsert`, `events/upsert`
обновляют по ID без дублей. `alerts/replace` сохраняет acknowledgement для
присутствующих стабильных ID. `alerts/acknowledge` не меняет измерения.
`fixture/reset` возвращает исходный integration sample, а не запускает simulator.reset.

Эти действия принимают доверенные типизированные записи. Внешние JSON, ввод
пользователя и данные приборов требуют runtime-валидации на границе модуля:
тип TypeScript не заменяет её. Не отправлять произвольный JSON прямо в reducer.
Общая схема валидации должна быть согласована с владельцем health-модуля.

## Хранение и автономность

Текущее состояние находится в памяти. Обновление страницы предсказуемо
сбрасывает fixture; это обозначено в UI. Постоянное хранение, миграции, права
пользователей и экспорт пока не добавлены.

Шрифты системные, все runtime JS/CSS входят в сборку. Внешние ссылки открываются
только по действию пользователя. Основная оболочка не требует API или CDN.
Это ещё не installable/offline PWA: service worker и кеш холодного запуска
не реализованы. Локальный сервер после build может работать без интернета.
Будущий CV обязан включать модели локально перед заявлением offline CV.

## Предложения к контрактам — без внесения изменений

Перед реализацией следующих функций согласовать отдельный PR:

- SourceReference registry в mission/store: сейчас у fixture отдельный справочник;
  MissionState не содержит sources. Нельзя выдавать sourceRefId за проверенный URL.
- История действий/процедур: HealthAlert имеет только new/acknowledged;
  подтверждение не означает «проверка выполнена» или «здоровье восстановилось».
- Контекст измерений rest/exercise, анатомические категории и confidence CV
  не имеют отдельных канонических полей. Не дублировать domain types в модулях.
- Срок актуальности записей, правила runtime-валидации и lifecycle/история
  исчезнувших предупреждений требуют согласования с health-разработчиком.

## Четыре задания команде

| Ветка | Папки | Первый результат |
|---|---|---|
| `feat/mission-ui` | `src/mission/` | Экспорт `MissionView` по MissionViewProps; выбор человека/отсека; без собственного store |
| `feat/health-engine` | `src/health/` | `HealthView` + HealthEvaluatorPort; источники/единицы/пропуски; тест объяснимого demo-alert |
| `feat/simulation` | `src/simulation/` | SimulationPort + SimulationView; повторяемый seed; clock управляет интегратор |
| `feat/vision-anatomy` | `src/vision/`, `src/anatomy/` | VisionView/VisionPort и AnatomyView; корректный отказ/остановка камеры; ActivityRecord |

Каждый начинает от принятой интеграционной основы, читает AGENTS.md и ТЗ,
проверяет пример props, работает в своей ветке и папке. Создание ветки:

```sh
git switch -c feat/mission-ui chore/integration
```

После принятия основы в main создавайте ветки от обновлённого main.
Изменения entry point, package/lockfile, app и contracts согласовываются
с интегратором. Представьте PR с `npm run check`, краткими шагами проверки,
ограничениями, источниками/лицензиями и скриншотом для UI.

## Инструменты и лицензии

Зависимости и точные версии зафиксированы в package-lock.json. Используются
React, Vite, Tailwind, TypeScript, ESLint, typescript-eslint, Vitest, Testing
Library и jsdom; лицензионные файлы поставляются в соответствующих пакетах.
Новых сторонних моделей, изображений и датасетов в этой основе нет. Системные
шрифты не включены в репозиторий. Код подготовлен с помощью OpenAI Codex.

ESLint 10 выбран как поддерживаемая версия. Scoped npm override повышает
minimatch у typescript-estree до 11 из-за GHSA-g3hv-75wg-m249; это изменение
только dev tooling. Совместимость проверяется lint/typecheck/tests/build.
Удалить override после upstream-исправления зависимости, повторив проверки.
