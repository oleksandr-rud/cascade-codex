# Review the specification as an implementation contract

Review the declared scope and sources with the LLM. Mark findings by affected ID,
concrete contradiction or missing decision, consequence and repair. Do not infer
quality from heading presence, diagram count or words such as secure or complete.
Apply each question to the subject's actual scope. For non-software subjects use
their process/value/evidence contracts; software-only checks may be inapplicable.

1. Can each capability be followed through a concrete success scenario and relevant
   failure/recovery path? Does its result meet the user's purpose?
2. Can the frontend author identify each screen, component, data dependency, action,
   loading/empty/error state, navigation result and governing design?
3. Can an API caller construct a valid request and understand the response, auth,
   validation, pagination, retry and durable completion semantics?
4. Can a backend author implement the named handler from its algorithm, typed inputs,
   dependencies, transaction boundaries and specific failure mapping?
5. Can a database author create the physical schema and migrations, including keys,
   nullability, indexes, deletion/retention and concurrent integrity enforcement?
6. Do rules, permission checks, lifecycle transitions and external effects agree
   across UI, API, handler, database and worker contracts?
7. Can the developer run the project, initialize data and config, test the agreed
   behavior and understand deployment, migration and recovery?
8. Do acceptance cases specify fixture, action, observable oracle and negative/race
   cases where material? Planned test IDs are not passing execution evidence.
9. Are diagram nodes and consequential edges bound to the owning contracts? Does a
   sequence preserve commit/effect order, an ER diagram preserve DDL cardinality,
   and a state diagram preserve permissions and terminal behavior?
10. Are assumptions and proposed choices visible? Are existing source versions
    compatible? Can unrelated policies and context be omitted from implementation?
11. Did each material source requirement survive or receive an explicit disposition?
    Are shared architecture rules compatible with concrete contracts? Did research
    or a planned probe remain visibly unverified where execution never occurred?
12. For the actual profile, are interview, subject contracts, acceptance and review
    covered? If a configured skill was selected, were its scope, required inputs,
    native gaps/status and result provenance preserved?

For a developed solution, use [W05](development-policies/W05-consistency.md) to
review agreement and source preservation without creating another normative spec.
Use [profile coverage](profile-coverage.md) and
[policy bindings](policy-bindings.md) for the last check when applicable.

Perform format/link and diagram syntax checks mechanically. Render selected
diagrams and inspect readability; record exactly which ones. For specialized
formal notation, record the manual and manual review rather than claiming that
a generic Mermaid renderer validates IDEF compliance.
