# Плагіни, ролі та маршрути Cascade

Огляд поточного checkout `master` від 2026-09-08. Це аудит і пропозиція,
не дозвіл на автоматичний запуск агентів, видалення скілів або міграцію
інструкцій. Паралельні незакомічені зміни AI Architect і Prompt збережені.

## Висновок

У каталозі **14 плагінів, 61 скіл**. Локальний harness має **6 ролей і 9
репозиторних скілів**. Плагіни володіють переносимими методами; ролі визначають
відповідальність, межі та вибір методу; локальні скіли виконують прив'язані до
репозиторію дії. Копіювати тіла плагінних скілів у локальні не потрібно.

`default_orchestrator` не перемикає головного агента автоматично. У поточному
коді це перевірюване декларативне поле. Інструкції кастомної ролі передаються
Codex під час створення сесії з цією роллю; сам факт наявності TOML цього не
робить. У цьому завданні не створювали окремого Orchestrator: його контракт
було прочитано під час аудиту, а не автоматично на вході.

## Каталог можливостей

Нижче — короткий зміст тригерів, а не новий маршрутизатор. Точні `triggers`,
`anti_triggers`, входи, виходи, залежності й дозволені ефекти належать
`capabilities.yaml` відповідного плагіна. Назви скілів нижче мають префікс
плагіна, наприклад `cascade-coding-agent:maintain-harness`.

| Плагін / джерело | Скіли та коли їх обирати |
|---|---|
| [Prompt](../../../.codex/plugins/cascade-prompt/capabilities.yaml) | `prompt` — створення, уточнення, діагностика, порівняння чи тестування промпта та його контексту. |
| [Simulations](../../../.codex/plugins/cascade-simulations/capabilities.yaml) | `manage-simulation-campaign` — визначити або керувати багатосценарною кампанією; `execute-simulation-campaign` — виконати вже погоджену кампанію; `simulate` — один обмежений акторний цикл; `simulation-actor` — виконуваний актор; `simulation-persona` — спожити заморожену persona-проєкцію; `simulation-brief` — контекст продукту/функції; `simulation-outcome` — спостережуваний результат; `simulation-adapter` — дозволені дії на поверхні; `simulation-review` — перевірити заморожений динамічний запуск. |
| [Evals](../../../.codex/plugins/cascade-evals/capabilities.yaml) | `evaluate` — загальний контракт оцінювання; `build-judge` — рубрика, профіль і калібрування судді; `prompt-evaluation` — оцінювання промптів; `agent-evaluation` — агентів і циклів; `simulation-evaluation` — незалежний висновок про симуляцію; `harness-evaluation` — тригери, маршрути, ролі й траси coding harness. |
| [AI Architect](../../../.codex/plugins/cascade-ai-architect/capabilities.yaml) | `architect-ai-system` — цілісний пакет AI-архітектури; `map-agent-capabilities` — карта можливостей; `design-agent-blueprint` — топологія та поведінкова архітектура; `design-agent-workflow` — цикл, стани та переходи; `build-agent-roles` — межі ролей; `build-agent-skills` — проєкти скілів; `prepare-agent-prompt` — передача одного цільового промпта в Prompt; `derive-persona-requirements` — вимоги з persona-проєкції; `prepare-agent-evaluation` — заморожений запит в Evals; `improve-agent-system` — обмежений offline-експеримент поліпшення. |
| [Software Architect](../../../.codex/plugins/cascade-software-architect/capabilities.yaml) | `architect-software-system` — архітектура програмної системи; `select-architecture-patterns` — вибір патернів із каталогу; `review-architecture` — рев'ю меж і контрактів; `review-change` — рев'ю конкретного diff. |
| [Coding Agent](../../../.codex/plugins/cascade-coding-agent/capabilities.yaml) | `audit-harness` — read-only аудит; `adapt-harness` — адаптація до іншого репозиторію; `maintain-harness` — погоджена зміна чинного harness; `integrate-agent-assets` — інтеграція вже перевірених кандидатів ролей/скілів/промптів. |
| [Personas](../../../.codex/plugins/cascade-personas/capabilities.yaml) | `build-persona` — канонічна persona з доказів або явно синтетична; `compile-persona` — заморожена проєкція для конкретного споживача; `evaluate-persona` — перевірка обґрунтованості та узгодженості. |
| [Product](../../../.codex/plugins/cascade-product/capabilities.yaml) | `manage-product-lifecycle` — стан ініціативи й власницькі gates; `define-product` — PRD, вимоги, сценарії та MVP; `validate-product` — перевірка проблеми, цінності чи продуктового результату. |
| [Market](../../../.codex/plugins/cascade-market/capabilities.yaml) | `research-market` — ринок, сегменти, альтернативи; `evaluate-market-opportunity` — оцінити підтверджену можливість; `design-market-experiments` — перевірки попиту, ціни й каналів; `brand-positioning` — позиціонування та комунікація з доказами. |
| [Design](../../../.codex/plugins/cascade-design/capabilities.yaml) | `ux-flow-review` — логіка користувацького шляху; `design-system` — повторно використовувані правила інтерфейсу; `accessibility-review` — доступність; `visual-qa` — фактичний вигляд і взаємодія на різних екранах. |
| [Security](../../../.codex/plugins/cascade-security/capabilities.yaml) | `codebase-audit` — read-only аудит коду; `auth-analysis` — auth, сесії, ролі та ізоляція; `secure-design` — довірчі межі й ризики запропонованої зміни. |
| [Project Management](../../../.codex/plugins/cascade-project-management/capabilities.yaml) | `define-work-item` — одна задача для трекера; `plan-project` — план/ітерація; `manage-project` — узгодження поточного стану; `close-project` — оцінка завершення і пропозиція зберігання історії. |
| [QA](../../../.codex/plugins/cascade-qa/capabilities.yaml) | `plan-quality` — ризики й критерії якості; `design-tests` — план, сценарії та оракули; `assess-quality` — оцінити заморожені докази; `triage-defects` — відрізнити дефект, test drift, середовище, flaky чи неоднозначність. |
| [Coordinator](../../../.codex/plugins/cascade-coordinator/capabilities.yaml) | `select-capabilities` — вибрати найменший достатній набір, коли маршрут неоднозначний; `plan-workflow` — побудувати залежності з уже перевіреного вибору. Не запускає агентів і не надає дозволів. |

## Ролі та локальні інструкції

| Роль | Власна відповідальність | Джерело інструкцій / точні посилання |
|---|---|---|
| Orchestrator | Зрозуміти запит, обрати пропорційний маршрут, виконати або погоджено делегувати, зібрати доказовий результат | `.codex/agents/orchestrator/AGENT.md`, `skills.yaml` |
| Agent Engineer | Harness, інтеграція перевірених агентних активів, конфігурація, інструменти й методи | `.codex/agents/agent-engineer/AGENT.md`, `skills.yaml` |
| Security | Read-first перевірка довірчих меж, auth, секретів, дозволів | `.codex/agents/security/AGENT.md`, `skills.yaml` |
| Simulation Operator | Погоджене виконання, спостереження, freeze і cleanup; не judgment | `.codex/agents/simulation-operator/AGENT.md`, `skills.yaml` |
| Simulation Evaluator | Незалежна read-only оцінка заморожених доказів симуляції | `.codex/agents/simulation-evaluator/AGENT.md`, `skills.yaml` |
| Harness Evaluator | Незалежна оцінка придатних трас harness за фіксованою рубрикою | `.codex/agents/harness-evaluator/AGENT.md`, `skills.yaml` |

Репозиторні скіли: `context`, `plan-change`, `implement-change`,
`validate-change`, `create-spec`, `pattern-context`, `run-qa-plan`,
`repair-tests`, `closeout`. Це локальний контекст, виконання, валідація та
збереження, а не альтернативні копії переносимих плагінних методів.

## Знайдені прогалини

1. **Завантаження Orchestrator на вході не гарантоване.**
   `.codex/config.toml` містить `harness_agents.default_orchestrator`, але
   його перевіряє `scripts/cascade/validate.ts`, а не диспетчер виконання.
   TOML ролі просить прочитати `AGENT.md` і `skills.yaml` тільки після вибору
   цієї ролі. `CODEX.md` не вимагає такого читання від звичайного root.
   Пропозиція: один короткий root-bootstrap у `CODEX.md`, який завантажує
   контракт Orchestrator без створення іншого агента. Спеціалізовані ролі
   завантажувати лише за відповідним маршрутом.

2. **Повторення інструкцій, а не зайві власники.**
   Звичайний маршрут повторюється в `AGENTS.md`, `CODEX.md` та Orchestrator.
   `maintain-harness` частково повторює планування/реалізацію, але додатково
   перевіряє ідентичність source/install, переносимість і межі harness.
   Пропозиція: залишити його тонким спеціалізованим маршрутом; спільний
   порядок роботи посилати на одного власника. Не видаляти автоматично.

3. **Неузгоджений тип persona-артефакту для AI Architect.**
   `compile-persona` виробляє `persona-projection`, а
   `derive-persona-requirements` споживає `persona-architecture-projection`.
   Це optional, а не required dependency; сам каталог може бути валідним,
   але прямий typed binding не збігається. Пропозиція: погодити спільний тип
   з обов'язковою ціллю `agent-architecture`, або явно описати окремий
   типізований вихід у власника проєкції. Не створювати другого автора persona.

4. **Суперечливий anti-trigger blueprint.**
   `design-agent-blueprint` має вибирати топологію, але descriptor відсікає
   запит, коли topology або capability map ще невизначені. Невизначена
   топологія може бути причиною виклику, а не блокером. Пропозиція: залишити
   блокером відсутню обґрунтовану карту можливостей, не сам вибір топології.

5. **Деякі тригери розпадаються на надто широкі фрагменти.**
   Незалапковані речення з комами в YAML flow-list стають кількома пунктами.
   Наприклад, у Persona виникають самостійні `market`, `architecture`,
   `evaluation`; в AI Architect — фрагменти одного anti-trigger.
   Пропозиція: один повний намір на пункт, явні лапки для речень із комами.
   Після зміни перевіряти тільки зачеплені колізії, не весь corpus.

6. **Каталог, skill-map і доступний плагін — різні рівні.**
   Рольові `skills.yaml` містять точні посилання, але це не автоматичний
   виклик і не повний список усіх 61 доступних методів. У Agent Engineer
   також лишилося формулювання про personal simulation plugin, хоча
   Simulations тепер є в repo marketplace. Пропозиція: звірити map із
   відповідальністю ролі та прибрати застарілий поділ personal/repo;
   не завантажувати всі скіли в контекст кожного агента.

## Рекомендована межа інструкцій

```text
AGENTS.md — тонкий спільний контракт
  -> CODEX.md — порядок завантаження та правила хоста
  -> обрана роль / AGENT.md — відповідальність і дозволені межі
  -> обрана роль / skills.yaml — точні namespaced-посилання
  -> потрібний plugin SKILL.md — один власник методу
  -> локальні скіли — виконання, перевірка й збереження в репозиторії
```

Coordinator потрібен для неоднозначного багатоплагінного запиту, а не як
обов'язковий крок перед очевидним викликом. Його перевірений план описує
залежності артефактів, але не надає повноважень і не запускає ролі.

Публічний контракт Codex також описує custom-agent TOML як конфігураційний
шар **створеної сесії**, не як автоматичний root-router:
[Codex custom agents](https://developers.openai.com/codex/multi-agent#custom-agents).

## Межа доказів

Огляд охопив каталог, усі descriptors, шість рольових контрактів і карти
скілів, boot/routing та згадані AI Architect/Coding Agent методи.
Це не незалежний семантичний judgment усіх 61 скілів і не доказ роботи
кожного плагіна на цільовому продукті. Масового видалення, дублювання
скілів, зміни тригерів чи автоматичного делегування цей аудит не виконує.
