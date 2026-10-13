# Bounded native decision adapter

`scripts/native-decisions.py` runs a new bound diagnostic pack with at most
six single-question cases. It accepts schema-v2 bindings for the inspected
Intern-Decision and Imajev 2B/4B releases, verified local files, CUDA/BF16 and
a fixed 4096-token input cap. Each arm has a 300-second load deadline,
180 seconds per case and 900 seconds overall. Missing resources or arithmetic
drift is BLOCKED; raw responses survive validation failure. No checkpoint
alias, download, generic generation or implicit runtime fallback occurs.

The portable `native_scoring_backend.py` delegates Intern to its pinned
first-party DecisionEngine/HF scorer with a loader-only explicit
`trust_remote_code=False` patch written into the new output directory.
It uses a reviewed scoped implementation of Imajev's standard compiler,
unmerged PEFT LoRA, trained float32 readout, actual template-bound codebook,
up to four cyclic log-probability rotations and shipped temperature artifact.
It does not execute downloaded Imajev Python or claim the full published
server was tested. Existing model assets are read-only.

The controller preserves each family's result semantics. Intern confidence
is maximum candidate probability. Imajev confidence for Choice/Score is
candidate concentration times known mass; unknown is native abstention.
Score remains the ordered probability-weighted expectation with its exact
legend, and Noul remains a probability, including Imajev's neutral unknown
mass. A returned value never grants action authority. Any ordinary review
option must be explicitly present in the supplied question; the adapter
does not silently add one.

Unqualified decision outputs must not supply authorization. Use the accepted
host permission state even when a native answer strongly claims permission.
`imajev4b-permission-regression-v1.json` preserves an actual diagnostic where
explicit host permission was false and Imajev returned Noul 0.914004. The
native arithmetic remains valid, the semantic classification is wrong, and
the result's action authority remains NONE. Retain this regression without
rewriting the model answer or presenting it as calibration.

Freeze implementation digests, asset manifests, actual image bytes, questions,
operator criteria and equal budgets before dispatch. Keep authored development
checks separate from independent human calibration, sealed acceptance and
action qualification. Software installation and native execution alone do
not satisfy those gates. See `test-native-decisions.py` for arithmetic,
identity, unknown-mass and loader-inventory controls.
