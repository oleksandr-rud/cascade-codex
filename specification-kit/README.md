# Specification Kit

Самостійний плагін для побудови специфікацій продукту, компанії, сценарію, тестів,
повної апки та зміни функціоналу. Є один основний SPEC із точними посиланнями на
власників API, SQL, дизайну й тестів, коли їх потрібно винести в окремі файли.

## Три skills

| Skill | Що робить |
|---|---|
| [build-spec](skills/build-spec/SKILL.md) | Інтерв'ю, вибір профілю/політик, конкретні контракти frontend/backend/даних/правил/операцій і приймання |
| [spec-diagrams](skills/spec-diagrams/SKILL.md) | Вузька діаграма для потрібного питання, нотація, прив'язки до контрактів і окремі докази перевірки |
| [spec-test-design](skills/spec-test-design/SKILL.md) | Кейси, фікстури, рівні тестування, оракули й умовне планування тестових/симуляційних кампаній |

Інтерв'ю → поведінка, правила й чернетка приймання → розв'язання конкретних питань →
контракти кожної функції разом із діаграмами й тестами → потрібне планування кампанії →
перевірка узгодженості. [Порядок роботи](skills/build-spec/references/development-path.md)
описує залежності, а не обов'язкові церемонії.

## Політики й шаблони

[Каталог](skills/build-spec/references/policy-catalog.yaml) містить 18 блоків вмісту
S01–S18 та 7 методів W01–W07. W01 розширює ідеї, W02 досліджує, W03 обирає рішення,
W04 підключає тест-дизайн, W05 перевіряє узгодженість, W06 підключає потрібний
дизайн-метод, W07 планує кампанії лише за реальної потреби координації.

- [Повна апка](skills/build-spec/assets/templates/FULL_APPLICATION.md).
- [Продукт](skills/build-spec/assets/templates/PRODUCT.md).
- [Компанія](skills/build-spec/assets/templates/COMPANY.md).
- [Сценарій](skills/build-spec/assets/templates/SCENARIO.md).
- [Тести](skills/build-spec/assets/templates/TEST.md).
- [Зміна функціоналу](skills/build-spec/assets/templates/FEATURE_CHANGE.md).
- [Покриття профілів](skills/build-spec/references/profile-coverage.md).
- [Приклад DeskSlot](skills/build-spec/assets/examples/deskslot/SPEC.md) та його
  [тестова специфікація](skills/build-spec/assets/examples/deskslot/TEST.md).

Тест-дизайн вибирає unit, contract/integration, E2E, симуляцію користувача або
спостереження за тим, який ризик і механізм вони перевіряють. Усі рівні не потрібні
для кожної функції. Планування й виконання мають окремі стани та повноваження.

## Підключення спеціалістів

[Правила](skills/build-spec/references/policy-bindings.md) і
[пресет](skills/build-spec/assets/policy-bindings.ecosystem.yaml) дозволяють
законфігурувати доступні research, architecture, design, QA та simulation skills.
Назва в конфігурації лише додає кандидата. Активна LLM обирає потрібний метод,
читає його поточний контракт і зберігає вимоги до входів, джерел та результату.

W06 обирає створення дизайну, UX, design-system, accessibility чи visual QA.
W07 зберігає рідні контракти QA/Simulations: прийняту поведінку, risk_ref,
зареєстровані adapter_id, необхідні actor/brief/outcome/persona прив'язки.
Відсутній вхід лишається прогалиною. План не запускає тести чи агентів.

## Використання

`specification-kit/` — канонічне джерело плагіна з маніфестом
[plugin.json](.codex-plugin/plugin.json). Репозиторний marketplace посилається
безпосередньо на цей каталог. Старий `cascade-specs:synthesise-spec` замінений
трьома маршрутами `specification-kit:<skill>`; друга копія плагіна не підтримується.

Для експорту всіх трьох skills у `exports/skills/`:

```powershell
bun scripts/build-spec-skill.ts --write
bun scripts/build-spec-skill.ts --check
```

Експорт встановлюється комплектом із трьох каталогів, оскільки методи посилаються
на спільні правила й шаблони. Встановлення в профіль Codex — окрема дія.
Плагін працює без Cascade runtime і не перемикає модель. `capabilities.yaml`
потрібен лише для каталогу цього хоста; його model_policy не є вимогою skills.

> Use $build-spec to interview me and build a full application specification.
> Use $spec-test-design to derive cases and decide whether a campaign plan is needed.

## Межі доказів

Авторські приклади демонструють структуру; реалізацію апки сюди не включено.
Формат/посилання/експорт і схеми перевіряються механічно. Рендер не встановлює
семантичну узгодженість; семантичний перегляд не встановлює реалізовану поведінку.
[Діаграмні докази](skills/spec-diagrams/references/diagram-evidence.schema.json)
прив'язуються до конкретних source/owner SHA-256, а зміна контракту робить
відповідний попередній перегляд застарілим.

[Джерела й адаптації](skills/build-spec/references/sources.md) пояснюють використані
механіки Superpowers, Spec Kit, OpenSpec, BMAD/TEA та IDEF/C4. Цілі чужі skills чи
runtime не переносилися. Внутрішні методи OpenWorkbench не використано: раніше
перевірені OpenSpecKit/OpenPattern були недоступні. Нового порівняльного запуску
моделей або кампанії генерації всіх шести профілів не проведено.
Операційну модель світу відкладено.
