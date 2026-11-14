# AEGIS — Technical Specification v1.0

**Проект:** Astronaut Health Monitoring & Mission Digital Twin  
**Соревнование:** NASA Space Apps Challenge 2026  
**Задача:** Create Health Monitoring Software for Astronauts on Space Missions  
**Состояние документа:** исходная инженерная спецификация; принимается командой в качестве стартовой архитектуры, медицинские пороги и научные данные требуют подтверждения.  
**Дата:** 14 ноября 2026 г.  
**Язык интерфейса MVP:** английский; документация для команды — русский.

## 0. Краткое определение проекта

**AEGIS** — прототип автономной системы, которая позволяет астронавту собирать показатели собственного здоровья, замечать отклонения и получать объяснимые рекомендации о дальнейших *проверках и обращении к установленным медицинским процедурам*. В отличие от разрозненных графиков система объединяет самочувствие, физиологические измерения, физическую активность, контекст помещения и события миссии.

Визуальный контекст — интерактивный **схематический разрез космического корабля**, где отображаются расположение членов экипажа, состояние оборудования/окружения и предупреждения. Симуляция разворачивает события миссии, позволяя проверить работу алгоритмов. **Камера — необязательный локальный измерительный модуль для упражнений; не средство надзора за дисциплиной**.

Это **исследовательский хакатонный прототип, а не медицинское изделие**, не клинический диагноз и не сертифицированное ПО космического корабля.

### 0.1 Соответствие формулировке NASA

В официальном задании требуется ПО, которое **gathers health indicators** и **enables astronauts to evaluate and act on the status of their health**. Следовательно, основной пользователь — **сам астронавт**, а не только наблюдатель миссии. В AEGIS последовательность *collect → understand → decide next step* должна работать и без корабля, камеры, сети и 3D-анимации.

### 0.2 Что является главной инновацией

Контекстная, объяснимая интеграция данных разного происхождения и качества, показанная на интерактивной модели миссии: «Что изменилось? У кого? Где? Как мы это заметили? Что нужно проверить дальше?».

### 0.3 Что НЕ является целью

- Контролировать соблюдение дисциплины профессиональным экипажем.
- С помощью обычной камеры диагностировать болезни, состояние внутренних органов, иммунитет, потерю костной массы, психические расстройства.
- Получать клинически валидные прогнозы из придуманных коэффициентов симулятора.
- Подменять врача, выдавать лечение, дозы препаратов или автономно принимать опасные решения о жизнеобеспечении.
- Моделировать конструкцию Starship как подлинную инженерную схему (использовать **fictional deep-space vehicle**, визуально вдохновлённый популярными концептами при соблюдении лицензий).

## 1. Роли и пользовательские сценарии

**Роль A — Astronaut (основная):** открывает персональный монитор, вводит самочувствие/измерение, видит тренды, причину предупреждения, источник данных и безопасный следующий шаг (повторить измерение/проверить прибор/следовать регламенту/сообщить медицинскому специалисту).

**Роль B — Crew/mission observer (демо):** видит экипаж и корабль, открывает профили/помещения; в реальном продукте доступ ограничивается правами.

**Роль C — Demo operator:** выбирает сценарий и ускоряет/останавливает виртуальное время. Это специальный **демонстрационный режим**; сценарии не должны притворяться реальными датчиками.

### User journey A — самоконтроль

1. Астронавт открывает **My Health** (или выбирает себя из экипажа).
2. Видит текущие показатели и статус их достоверности (`observed`, `synthetic`, `missing`).
3. Смотрит тренд против персонального baseline за выбранный период.
4. Видит объяснимое предупреждение с указанием времени, наблюдений, уровня уверенности/качества и ограничения интерпретации.
5. Открывает предложенный безопасный следующий шаг, подтверждает прочтение, при необходимости добавляет повторное измерение или заметку.

### User journey B — событие среды

Симулятор меняет CO₂ в конкретном отсеке → создаётся `EnvironmentalMeasurement` → движок формирует событие среды и предупреждение → digital twin подсвечивает **отсек**, а профили экипажа показывают контекст присутствия (без диагноза от CO₂) → пользователь просматривает данные и открывает процедуры проверки.

### User journey C — компьютерное зрение

Астронавт сознательно запускает **Exercise Check** → браузер запрашивает доступ к камере → локальный Pose Estimation анализирует движение и считает заданные повторения с указанием ограничений → создаёт `ActivityRecord` → профиль обновляется. По умолчанию камера выключена; видео не сохраняется; отказ в разрешении ничего не ломает.

## 2. Архитектура

```text
  [Manual/self-report]   [Synthetic mission]   [Opt-in computer vision]
          |                      |                        |
          +----------------------+------------------------+
                                 |
                Typed domain contract + provenance
                                 |
                   Data store / state manager
                        /                \
            Health evaluator         Mission events
                        \                /
                       Alerts + explanations
                                 |
        +------------------------+----------------------+
        |                        |                      |
  Astronaut dashboard      Mission cutaway      Demo scenario controls
        |
  User action/acknowledge
```

**Рекомендованный стек:** TypeScript, React, Vite; SVG/2.5D-корабль, опционально Three.js/R3F после готового вертикального среза; графики на Recharts или SVG; локальное хранение в IndexedDB/localStorage; Pose Estimation через MediaPipe в отдельном модуле. Не нужен backend для первого работоспособного прототипа.

**Принцип:** единое происхождение данных, единый timestamp, единая структура типов, воспроизводимые сценарии. Все фичи должны уметь читать из **одного** состояния приложения.

### 2.1 Компоненты

| ID | Компонент | Вход | Выход |
|---|---|---|---|
| M01 | Health Data Collector | manual, simulated, vision, optional imported | validated measurements, activity |
| M02 | Personal Health UI | measurements, baselines, alerts | readable charts, action and acknowledgement |
| M03 | Health Evaluator | normalized data, quality flags, selected policy | explainable alerts, insufficient-data flags |
| M04 | Environment Monitor | cabin CO₂/temp/pressure, radiation event | compartment warnings + exposure context |
| M05 | Mission Simulator | seed, clock, scenario id, initial profiles | synthetic observations, crew movement, events |
| M06 | Mission Digital Twin | compartments, positions, environmental state | navigable ship and crew overlays |
| M07 | Activity Vision (optional) | permissioned camera stream | local activity measurements |
| M08 | Anatomy Overview (optional) | approved health categories, data availability | annotated body/system diagram, NOT disease claim |
| M09 | Research/Provenance | source registry, data/threshold metadata | citations, simulation labels, limitations |

## 3. Наблюдаемые показатели

Показатели делятся на **физиологические**, **субъективные**, **поведенческие**, **средовые** и **специальные обследования**.

| Группа | В MVP | Способ получения | Что можно заключить |
|---|---|---|---|
| Pulse / resting HR, bpm | Да | симуляция, ручной ввод | изменение относительно baseline; не диагноз |
| Sleep duration, h | Да | дневник/симуляция | изменение продолжительности, тренд |
| Fatigue/stress self-report | Да | вопрос/симуляция | субъективная динамика; не психиатрический диагноз |
| Exercise sessions, min/count | Да | журнал/опц. камера | зарегистрированная активность; не прямая оценка мышечной массы |
| Cabin CO₂, ppm | Да | виртуальный датчик | средовое событие/возможный фактор воздействия |
| Cabin temperature/pressure | Да | виртуальный датчик | контекст среды и нарушение модели параметров |
| Radiation exposure/event | Да (сценарий) | виртуальный датчик | событие, зарегистрированная доза при наличии корректной единицы; не диагноз |
| Blood pressure | Дополнительно | ручной ввод/симуляция | отдельное измерение и тренд |
| Nutrition intake | Дополнительно | ручной журнал | полнота записей, соответствие плану без диагноза |
| Bone density/immune lab results | Не измерять автоматически | только отдельное обследование | выводить результаты, **не вычислять** из пульса/камеры |

**Обязательные поля наблюдения:** ID, astronaut ID/compartment, metric, value/null, unit, timestamp, acquisition method, origin (synthetic/observed/research dataset), quality, sourceRefId. Форматы заданы в [`../contracts/types.ts`](../contracts/types.ts).

### 3.1 Нет данных ≠ всё нормально

Запись с отсутствующим показателем должна показываться как **No data / insufficient evidence**, а не зелёный «норма». Не подменять отсутствие значений нулями. Если нет индивидуального baseline, показывать «baseline not established».

### 3.2 Использование NASA

Сначала картируем проверенные NASA Human Research Program риски на наблюдаемые показатели, затем проверяем подходящие наборы NASA OSDR; **никакие синтетические числовые значения нельзя выдавать за записи NASA**. Допустим исследовательский источник для объяснения риска, а для демонстрации чисел — явно подписанный `Synthetic Mission Data`.

## 4. Health Evaluator — объяснимый механизм

Система не «ставит диагноз», а фиксирует **signals for review**. Каждый сигнал включает факты, правило, время, источник и безопасное следующее действие.

### 4.1 Этапы обработки

1. Validate: корректная единица, timestamp, число, качество, источник, принадлежность астронавту.
2. Normalise: единицы и формат без преобразований, которые невозможно доказать.
3. Baseline/trend: сравнение текущего наблюдения с исходным персональным уровнем и предыдущими измерениями, если данных достаточно.
4. Rule evaluation: проверка явно заданных условий сценария, НЕ медицинские диагнозы.
5. Explanation: `HealthAlert` с идентификаторами породивших его измерений.
6. Presentation/action: отличить информацию, внимание и необходимость перепроверки; кнопка acknowledgement и ссылка на процедуру/источник.

### 4.2 Примеры только ДЕМОНСТРАЦИОННЫХ правил

**R-SLEEP-01:** если в *симулированном сценарии* последние N записей отражают укороченный сон плюс отметку усталости — вывести «Sleep pattern change: consider checking recovery plan» с явным **Demonstration Rule** и исходными наблюдениями. Числовые условия должны быть параметрами сценария и не представляться «порогами NASA».

**R-ENV-01:** если симулятор выбрасывает `co2-excursion` и значение отдельного датчика — «Cabin environment requires review» у соответствующего отсека, не диагноз астронавта. Указать, что границы в прототипе иллюстративные, пока не подтверждены инженерным стандартом.

**R-RAD-01:** если симулятор отправляет `radiation-event` — показать место/время/показание с предупреждением «Follow mission radiation safety protocol»; не рассчитывать риск рака или острого поражения без валидированной дозиметрической модели.

**R-DATA-01:** если запись устарела/отсутствует — «Measurement unavailable», а не «healthy».

### 4.3 Требования объяснимости

У каждого предупреждения есть: *что замечено*, *на основании чего*, *каких данных не хватает*, *демонстрационное ли правило*, *что можно безопасно проверить*, *когда возникло* и *связанные источники*. Запрещены фразы «AI diagnosed…», «99% disease probability» без клинической валидации.

## 5. Mission simulator

### 5.1 Цель

Визуально демонстрировать путь «условия и поведение → измерение → обнаружение изменения → объяснение → реакция». **Не** симулировать точную реальную физиологию астронавтов.

### 5.2 Данные

Три вымышленных члена экипажа, стартовые baseline, шесть условных отсеков, расписания (sleep/work/exercise/check/rest), виртуальное время, `seed` для повторяемости, событийный журнал. Каждый сценарий действует на одну и ту же общую структуру состояния.

### 5.3 Управление

`Play`, `Pause`, `Reset`, `Speed x1/x10/x100`, `Scenario Select`; кнопки не должны создавать дубли измерений/алертов. После `Reset` при одинаковом seed получаем одинаковые данные. При `Pause` время и данные перестают обновляться.

### 5.4 Обязательные сценарии

1. **Normal Day:** routine activities and typical changing measurements; no fabricated illness.
2. **Sleep Disruption:** несколько дней более короткого сна + запись self-reported fatigue → alert с объяснением взаимосвязи; это не диагноз.
3. **CO₂ Excursion:** изменение параметра отсека → предупреждение среды и контекст расположения экипажа.
4. **Radiation Event:** виртуальный сигнал о повышенной радиационной обстановке → событие + рекомендации обратиться к плану защиты.

**Ограничение:** индикатор риска и доза в сценариях не должны выдавать ложную точность или изображать научно проверенное причинное моделирование.

### 5.5 Расположение экипажа

Люди перемещаются **согласно сценарию** и расписанию. Это визуальное представление, не фактическая система слежения по камерам. Присутствие используется только в контексте моделируемого воздействия и демонстрации.

## 6. Spacecraft digital twin / cutaway

**Комнаты (условные):** Living, Exercise, Medical, Workspace, Life Support, Radiation Shelter.

Функции: select room; select astronaut; show simulated occupancy and environmental measurement; room alert overlays; keyboard-accessible navigation; panel showing source/time/status; rapid switching to personal profile.

**Терминология:** внутри презентации можно говорить *mission digital twin prototype* или *interactive digital mission model*. Схема не претендует на цифровой двойник настоящего Starship или реальную пространственную геометрию корабля.

SVG/2.5D является полной реализацией MVP. 3D расширение — после функционального подтверждения.

## 7. Computer Vision (необязательная подсистема)

### Зачем она вообще нужна

Не для наблюдения за «послушанием» экипажа. Камера может дать **дополнительную объективную информацию о движении/упражнениях** при согласии пользователя. Это один из способов заполнить журнал активности без ручного ввода. Более того, во время настоящих космических тренировок алгоритм необходимо адаптировать к условиям и валидировать; хакатонная камера демонстрирует техническую связность, не готовность к полёту.

### Функции

- Нажатие `Start Exercise Assessment` с объяснением, какие данные собираются.
- WebRTC/MediaPipe Pose запускается **только** после пользовательского разрешения.
- Локально извлекаются положения основных суставов, качество трекинга и повторения ограниченного упражнения.
- После завершения создаётся `ActivityRecord`, а живой поток останавливается; видео не хранится.
- `Camera unavailable/denied` → журнал активности и вся остальная система продолжают работать.

### Что запрещено в MVP

Постоянное наблюдение, facial recognition, выводы о психическом здоровье по лицу, медицинский диагноз по видео, сохранение биометрического видео или автоматическое наказание за пропущенную тренировку.

## 8. Human Body Overview

Вариант MVP — интерактивная анатомическая 2D/3D-схема с вкладками **cardiovascular**, **musculoskeletal**, **behavioral/sleep**, **radiation context**. Необязательно моделировать все органы в 3D. Для каждой вкладки показать существующие показатели/факторы риска/неизвестные данные. Критически важно отделять **observed**, **possible risk**, **unknown**, **diagnosed by medical examination**. Нельзя окрашивать орган «больным», если об этом нет медицинских данных.

## 9. Экранная модель и навигация

| Screen | Обязательные элементы |
|---|---|
| S01 Mission Overview | ship cutaway, crew, compartments, mission clock, recent alerts |
| S02 My Health / Crew Profile | vitals, sleep, trends, last update, baseline, manual input |
| S03 Alert Details | trigger values, history, quality, source, safe next step, acknowledge |
| S04 Environment | measured/simulated room parameters, timeline, location, event |
| S05 Scenarios | seed, scenario selector, pause/reset/speed, demo label |
| S06 Activity Check | opt-in camera, pose/rep demonstration, stop, fallback |
| S07 Body Overview | organ-system tabs with measured/unknown labels |
| S08 Research & Credits | NASA research, datasets actually used, tools, AI, licenses |

**Навигация:** стартовать с My Health или показывать явно выделенный переход к нему с корабля. Primary CTA: `Check My Health`. Данные должны быть доступны без камеры и без анимации корабля.

**Доступность:** пользователь различает предупреждения не только по цвету; текст/иконки/единицы; управляемость клавиатурой; читаемые подписи.

## 10. Общий контракт данных и события

**Canonical TypeScript definitions:** `contracts/types.ts`. При принятии изменений отдельный PR. Не создавать разных типов `Astronaut`, `Crew`, `Metric`, `Alert` в пяти отдельных модулях.

Основные типы:

- `HealthMeasurement`, `EnvironmentalMeasurement` — наблюдения с provenance и quality.
- `CrewMember`, `Compartment` — справочники.
- `ActivityRecord` — записи об активности.
- `HealthAlert` — интерпретируемый результат правила.
- `MissionEvent` — история событий.
- `MissionState` — состояние и часы симуляции.
- `SimulationPort`, `HealthEvaluatorPort`, `VisionPort` — модули для интеграции.

### 10.1 Событийные каналы (логические)

`measurements/added` → health evaluator; `environment/added` → mission alerts; `activities/added` → health profile; `simulator/clock-ticked` → mission view; `simulator/scenario-changed` → reset/replay; `alerts/created` → notification and timeline; `alerts/acknowledged` → UI state.

Не обязательно использовать внешнюю шину событий. Для MVP это могут быть React state/actions и чистые функции.

### 10.2 Детерминизм и качество

Функции оценивания должны быть **pure** (одно и то же состояние → те же предупреждения). Времена пишутся ISO-8601 UTC, на экране разрешается показывать Mission Day. Все изменения инициируются единой state/clock логикой — запрет иметь пять несинхронизированных setInterval.

### 10.3 Безопасность типов

`null` для отсутствующих значений; отдельные единицы; `quality` и `origin` обязательны. Не перемешивать radiation events/dose without proper units. Любая конвертация единиц должна быть явной и тестируемой.

## 11. Хранение, offline-first и безопасность

MVP работает локально в браузере и демонстрируется с **полностью вымышленным экипажем**. Для сохранения событий между перезагрузками допустим IndexedDB/localStorage с версией схемы; нужно обеспечить reset. Интерфейс должен быть доступен без постоянного сетевого API; если MediaPipe грузит модели из CDN, offline CV считается **неподдержанным**, пока модель не включена локально. Нельзя заявлять offline работоспособность на основании одного только статического deployment без проверки.

Камера требует явного разрешения; поток и `MediaStreamTrack` останавливаются при закрытии. Доступ по https/localhost. Не загружать реальные сведения о здоровье и видео участников в публичный GitHub или сторонние API.

## 12. Критерии приёмки (тестируемые)

| ID | Требование | Тест принятия |
|---|---|---|
| FR-001 | Астронавт видит собственные показатели | Select astronaut → correct metrics, units/time/source |
| FR-002 | Самостоятельный ввод | Add valid value → timeline updates; invalid value rejected |
| FR-003 | История и baseline | Trend history shown; missing baseline marked unknown |
| FR-004 | Explainable alert | Trigger alert → linked values, rule, time, next check, demo tag |
| FR-005 | Synthetic origin | Every simulated observation clearly labelled as synthetic |
| FR-006 | No data | Missing reading never labelled normal/healthy |
| FR-007 | Mission navigation | Click room/crew → matching contextual view |
| FR-008 | Scenarios | At least normal, sleep, CO₂, radiation scripts available |
| FR-009 | Determinism | Same seed + actions → same event sequence |
| FR-010 | Pause/reset | Paused clock stops; reset removes scenario changes |
| FR-011 | Context mapping | Environment warning appears for correct compartment |
| FR-012 | Optional camera | Deny camera → no crash; no background surveillance |
| FR-013 | Vision activity (extension) | Live exercise → typed activity record, no saved video |
| FR-014 | Body context (extension) | Observed vs risk vs unknown clearly distinguished |
| FR-015 | Source registry | NASA research/actual datasets credited, demo threshold labelled |
| FR-016 | Build/deploy | Production build succeeds; shared deployment loads on independent device |
| FR-017 | Privacy | No secret/identifiable biometric/video checked into repository |
| FR-018 | Clinical caution | No unvalidated clinical certainty / self-treatment prescriptions |

## 13. QA and tests

**Unit:** record validation; threshold/demo rule provenance; null handling; deterministic scenario event IDs; source-label formatting.

**Integration:** mission scenario → measurement → evaluator → alert → dashboard; camera result → typed activity; reset/pause; switching between crew members.

**Manual E2E:** app loads, no unexpected error in browser console; no loss of critical features if camera denied; keyboard navigation; readable at 1366×768; preview via published URL; synthetic-data badge is always visible in demo mode.

**Scientific validation:** team member confirms that references actually support each displayed *general scientific claim*; exact numeric cutoff without direct evidence is visibly marked as a demo rule.

## 14. Scope decisions / priorities

**P0 — release blocking:** source-labelled synthetic data; personal health dashboard; 3 profiles; manual health entry; time-series; explainable alert; deterministic simulator; sleep and CO₂ scenarios; simple mission context; source/credits; working build; reviewable deployment.

**P1 — improves differentiation:** radiation event; room/location overlays; advanced charts, 3D cutaway polish; scenario speed controls; body visualization; pose exercise proof of concept.

**P2 — only when stable:** Sims-like animations for daily schedules; 3D anatomical organs; conversational AI; sophisticated long-term what-if analysis; more medical categories; external sensor hardware.

**Reason:** NASA task prioritizes self-monitoring and effective actions. Visual ambition must not replace functional medical decision support.

## 15. Division of work

See [`TEAM_TASKS.md`](TEAM_TASKS.md). One lead owns app bootstrap, entry points and integration. Other four work in **separate folders and branches**. Shared type changes require explicit approval. Each module should have its own acceptance tests. PR merges only after build passes and dependencies satisfy the contract.

## 16. Demo, presentation and submission

See [`DEMO.md`](DEMO.md). Main short demo: select astronaut → review trend and evidence → launch scenario → inspect explanation and next step → demonstrate spacecraft contextual overlay → optionally show live vision. Presentation in English with transparent acknowledgement of synthetic data, research vs implementation, and unvalidated nature of demo rules.

Submission deadline according to official Space Apps 2026 event page: **15 November 2026, 23:59 local time**; Tashkent preliminary judging begins **15 November at 14:00**. Plan build freeze well before local judging. Check Project Tab for actual file/link/media requirements.

## 17. Open technical decisions (assign owners rather than leave silent assumptions)

- Are all team members comfortable with TypeScript? **Owner: lead**; default remains TS unless clear blocker.
- Is ship drawn as SVG or 3D? **Owner: UI**; SVG/2.5D first.
- Where exactly will persistent state reside? **Owner: lead**; browser local by default.
- Which actual NASA dataset is usable? **Owner: medical/research**; document ID and variables before claiming direct use.
- Which specific CV exercise is reliably measurable? **Owner: vision**; include calibration and false-count caveat.
- Which thresholds are source-backed? **Owner: health**; otherwise clearly illustrative and not clinical.
- Which diagram assets/licenses are acceptable? **Owner: UI**; fictional ship illustration preferred.
- Where to host? **Owner: lead**; static deployment with test on different computer.

## 18. Definition of Done

AEGIS is accepted as a hackathon prototype when a user can open a shared application, see a synthetic astronaut's health records, add a measurement, inspect trends and missing data, launch at least two defined scenarios, receive traceable non-diagnostic alerts, understand a concrete next check/action, navigate a ship layout showing contextual environment changes, and inspect transparent sources. No camera, 3D rendering, or external API may be required for the core flow. Other features improve the showcase but cannot invalidate these conditions.

---

**References:** official task, NASA HRP and OSDR, and event timetable are cataloged in [`RESEARCH_AND_SOURCES.md`](RESEARCH_AND_SOURCES.md). This document is a **proposed engineering design**, not a statement that NASA has endorsed the features or safety thresholds.
