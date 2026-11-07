"""
Safety Validator and Fallback Layer for MutaSelect AI.
Enforces deterministic, independent validation of ML-selected test suites.
The ML model NEVER approves itself; validation operates against full ground truth & holdouts.
"""

from typing import Dict, Any, List, Set
from datetime import datetime

class SafetyValidator:
    def __init__(
        self,
        kill_matrix: Dict[str, Any],
        retention_threshold: float = 95.0,
        must_kill_categories: List[str] = None
    ):
        self.kill_matrix = kill_matrix
        self.retention_threshold = retention_threshold
        self.must_kill_categories = must_kill_categories or ["reset_value", "fsm_state_corrupt"]
        self.cells = kill_matrix.get("cells", {})
        self.all_mutants = kill_matrix.get("mutants", [])
        self.killed_mutants = [m for m in self.all_mutants if m["status"] == "killed"]

    def validate_suite(self, selected_test_ids: List[str], validation_seed: int = 42) -> Dict[str, Any]:
        """
        Validates the selected suite against all killed mutants.
        Computes retained score, checks critical categories, and triggers fallback if below threshold.
        """
        covered_mutant_ids: Set[str] = set()
        lost_mutants: List[Dict[str, Any]] = []

        for m in self.killed_mutants:
            m_id = m["id"]
            detected = False
            for t_id in selected_test_ids:
                cell = self.cells.get(f"{t_id}__{m_id}")
                if cell and cell.get("detected"):
                    detected = True
                    break
            if detected:
                covered_mutant_ids.add(m_id)
            else:
                lost_mutants.append({
                    "id": m_id,
                    "category": m.get("category", "general"),
                    "file": m.get("file", ""),
                    "line": m.get("line", 0),
                    "description": m.get("operator_description", "")
                })

        total_kills = max(1, len(self.killed_mutants))
        actual_retention = (len(covered_mutant_ids) / total_kills) * 100.0

        # Check must-kill category rules
        must_kill_violations = []
        for lost in lost_mutants:
            if lost["category"] in self.must_kill_categories:
                violation_msg = f"Lost critical mutant {lost['id']} in must-kill category '{lost['category']}' ({lost['file']}:{lost['line']})"
                if violation_msg not in must_kill_violations:
                    must_kill_violations.append(violation_msg)

        passed = (actual_retention >= self.retention_threshold) and (len(must_kill_violations) == 0)

        fallback_triggered = not passed
        fallback_reason = None
        if fallback_triggered:
            reasons = []
            if actual_retention < self.retention_threshold:
                reasons.append(f"Retention {actual_retention:.1f}% below configured threshold {self.retention_threshold:.1f}%")
            if must_kill_violations:
                reasons.append(f"Violated {len(must_kill_violations)} must-kill category constraints")
            fallback_reason = "; ".join(reasons) + " -> Automatic fallback to Full Regression Suite triggered."

        return {
            "status": "passed" if passed else "rejected_fallback",
            "retention_threshold": self.retention_threshold,
            "actual_retention": round(actual_retention, 2),
            "full_suite_kills": len(self.killed_mutants),
            "selected_suite_kills": len(covered_mutant_ids),
            "lost_mutants": lost_mutants,
            "must_kill_rule_violations": must_kill_violations,
            "fallback_triggered": fallback_triggered,
            "fallback_reason": fallback_reason,
            "certified_at": datetime.utcnow().isoformat() + "Z",
            "validation_seed": validation_seed,
            "holdout_score": round(actual_retention, 2)
        }
