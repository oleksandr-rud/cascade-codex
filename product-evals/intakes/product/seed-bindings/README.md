# Product Simulation Seed Bindings

Store authored product campaign seed bindings here. Each campaign manifest
references one JSON artifact in this directory through `seed_binding_file`.

Validate artifacts against `product-evals/intakes/seed-binding.schema.json`.
Mappings use stable `source_claim_id`, campaign claim, scenario, and task IDs;
do not derive dispositions by matching claim text. Harness campaigns and
harness intakes do not use this directory.
