#!/usr/bin/env python3
from __future__ import annotations

import copy
import unittest

from normalize_judge_ratings import PROTOCOL, digest, normalize_ratings
from test_evaluation_contracts import profile, response
from validate_judge import ContractError, validate_response


class RatingsTransportTests(unittest.TestCase):
    def setUp(self):
        self.profile = profile("outcome-v2", "outcome")
        self.binding = {"evaluation_id": "new-run", "subject_digest": "a" * 64,
                        "profile_id": "outcome-v2", "profile_version": 1,
                        "judge_identity": "independent-outcome", "judge_context_id": "new-context",
                        "model": "gpt-6-astra", "reasoning_effort": "high"}
        self.raw = {"schema_version": 2, "leakage_check": "PASS",
                    "ratings": response("e", "a" * 64, "j", "c", self.profile)["ratings"]}

    def test_controller_binds_identity_and_hashes_without_mutating_raw(self):
        original = copy.deepcopy(self.raw)
        normalized, receipt = normalize_ratings(self.profile, self.raw, self.binding)
        self.assertEqual(self.raw, original)
        self.assertEqual(normalized["evaluation_id"], "new-run")
        self.assertEqual(normalized["verdict"], "PASS")
        self.assertEqual(receipt["protocol"], PROTOCOL)
        self.assertEqual(receipt["raw_response_digest"], digest(original))
        self.assertEqual(receipt["normalized_response_digest"], digest(normalized))

    def test_private_threshold_and_floor_decide_independently(self):
        for ratings, threshold, floor, expected in [((3, 3), .8, 2, "FAIL"),
                                                  ((3, 3), .75, 2, "PASS"),
                                                  ((4, 1), .5, 2, "FAIL")]:
            with self.subTest(ratings=ratings):
                self.profile.update(threshold=threshold, minimum_dimension=floor)
                for item, rating in zip(self.raw["ratings"], ratings): item["rating"] = rating
                normalized, _ = normalize_ratings(self.profile, self.raw, self.binding)
                self.assertEqual(normalized["verdict"], expected)

    def test_legacy_contradictory_response_stays_invalid(self):
        legacy = response("e", "a" * 64, "j", "c", self.profile)
        legacy["verdict"] = "FAIL"
        with self.assertRaisesRegex(ContractError, "disagrees"):
            validate_response(self.profile, legacy)
        with self.assertRaisesRegex(ContractError, "transport v2"):
            normalize_ratings(self.profile, legacy, self.binding)

    def test_transport_cannot_override_verdict_identity_or_profile(self):
        for field, value in [("verdict", "PASS"), ("evaluation_id", "other"),
                             ("profile_id", "other"), ("threshold", 0)]:
            with self.subTest(field=field), self.assertRaises(ContractError):
                normalize_ratings(self.profile, {**self.raw, field: value}, self.binding)

    def test_binding_mismatch_and_missing_identity_rejected(self):
        for field, value in [("profile_id", "wrong"), ("profile_version", 2),
                             ("subject_digest", "bad"), ("model", "wrong"),
                             ("judge_context_id", "")]:
            with self.subTest(field=field), self.assertRaises(ContractError):
                normalize_ratings(self.profile, self.raw, {**self.binding, field: value})

    def test_leakage_duplicate_missing_boolean_and_unbound_rating_rejected(self):
        malformed = [{**self.raw, "leakage_check": "FAIL"},
                     {**self.raw, "ratings": self.raw["ratings"][:1]},
                     {**self.raw, "ratings": [self.raw["ratings"][0]] * 2}]
        for change in [{"rating": True}, {"evidence": []}, {"verdict": "PASS"}, {"dimension_id": "other"}]:
            altered = copy.deepcopy(self.raw)
            altered["ratings"][0].update(change)
            malformed.append(altered)
        for raw in malformed:
            with self.subTest(raw=raw), self.assertRaises(ContractError):
                normalize_ratings(self.profile, raw, self.binding)


if __name__ == "__main__": unittest.main()
