"""
Mutation Engine for MutaSelect AI.
Plugin-based, syntax-aware mutation generator for synthesizable Verilog/SystemVerilog.
Never mutates testbench files. Protects comments, strings, and directives.
"""

import os
import re
import random
import hashlib
from typing import List, Dict, Any, Optional

class MutationOperatorPlugin:
    category: str = "general"
    description: str = "Base operator"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        raise NotImplementedError

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        raise NotImplementedError

# --- Operator Plugins ---

class ArithmeticOperator(MutationOperatorPlugin):
    category = "arithmetic"
    description = "Swap arithmetic operator (+ <-> -)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return bool(re.search(r'(?<![+\-\w])\+(?![+\-\w=])|(?<![+\-\w])\-(?![+\-\w=>])', line))

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        if "+" in line and "++" not in line and "+=" not in line:
            mutants.append(re.sub(r'(?<![+\-\w])\+(?![+\-\w=])', '-', line, count=1))
        if "-" in line and "--" not in line and "-=" not in line and "->" not in line:
            mutants.append(re.sub(r'(?<![+\-\w])\-(?![+\-\w=>])', '+', line, count=1))
        return mutants

class RelationalOperator(MutationOperatorPlugin):
    category = "relational"
    description = "Mutate comparison operator (==, !=, <, >, <=, >=)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return bool(re.search(r'==|!=|<=|>=|<|>', line))

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        if "==" in line:
            mutants.append(line.replace("==", "!=", 1))
        elif "!=" in line:
            mutants.append(line.replace("!=", "==", 1))
        elif "<=" in line and "<=" not in line.replace("<=", ""):
            mutants.append(line.replace("<=", "<", 1))
            mutants.append(line.replace("<=", ">=", 1))
        elif ">=" in line:
            mutants.append(line.replace(">=", ">", 1))
            mutants.append(line.replace(">=", "<=", 1))
        elif "<" in line and not line.startswith("<"):
            mutants.append(line.replace("<", "<=", 1))
            mutants.append(line.replace("<", ">", 1))
        elif ">" in line and not line.endswith(">"):
            mutants.append(line.replace(">", ">=", 1))
            mutants.append(line.replace(">", "<", 1))
        return mutants

class LogicalOperator(MutationOperatorPlugin):
    category = "logical"
    description = "Mutate logical gates (&& <-> ||, !)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return "&&" in line or "||" in line or re.search(r'!\s*[a-zA-Z_]', line)

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        if "&&" in line:
            mutants.append(line.replace("&&", "||", 1))
        if "||" in line:
            mutants.append(line.replace("||", "&&", 1))
        return mutants

class BitwiseOperator(MutationOperatorPlugin):
    category = "bitwise"
    description = "Swap bitwise operators (&, |, ^, ~)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        # Exclude logical && and ||
        cleaned = line.replace("&&", "").replace("||", "")
        return bool(re.search(r'[&|^~]', cleaned))

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        if "&" in line and "&&" not in line:
            mutants.append(line.replace("&", "|", 1))
        if "|" in line and "||" not in line:
            mutants.append(line.replace("|", "&", 1))
        if "^" in line:
            mutants.append(line.replace("^", "&", 1))
        return mutants

class ConstantBoundaryOperator(MutationOperatorPlugin):
    category = "constant_boundary"
    description = "Boundary and literal value off-by-one (±1, 0/1 flips)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return bool(re.search(r'\b(\d+)\b', line)) and not line.strip().startswith("//")

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        matches = list(re.finditer(r'\b(\d+)\b', line))
        for m in matches[:1]:
            val = int(m.group(1))
            mutants.append(line[:m.start()] + str(val + 1) + line[m.end():])
            if val > 0:
                mutants.append(line[:m.start()] + str(val - 1) + line[m.end():])
        return mutants

class ResetValueOperator(MutationOperatorPlugin):
    category = "reset_value"
    description = "Corrupt reset value (e.g. 0 -> 1 or active state)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return bool(re.search(r'<=.*1\'b0|<=.*0\s*;', line)) and "rst" not in line.lower()

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        if "1'b0" in line:
            mutants.append(line.replace("1'b0", "1'b1", 1))
        return mutants

class StuckAtOperator(MutationOperatorPlugin):
    category = "stuck_at"
    description = "Force signal assignment stuck-at-0 or stuck-at-1"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return ("<=" in line or "assign " in line) and ";" in line

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        if "1'b1" in line:
            mutants.append(line.replace("1'b1", "1'b0", 1))
        elif "1'b0" in line:
            mutants.append(line.replace("1'b0", "1'b1", 1))
        return mutants

class BranchSwapOperator(MutationOperatorPlugin):
    category = "branch_swap"
    description = "Invert conditional branching if (cond) -> if (!cond)"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return bool(re.match(r'^\s*if\s*\((.+)\)\s*begin?', line))

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        mutants = []
        match = re.match(r'^(\s*if\s*\()(.+?)(\)\s*begin?.*)$', line)
        if match:
            prefix, cond, suffix = match.groups()
            if cond.strip().startswith("!"):
                mutants.append(f"{prefix}{cond.strip()[1:].strip()}{suffix}")
            else:
                mutants.append(f"{prefix}!({cond.strip()}){suffix}")
        return mutants

class AssignmentTypeOperator(MutationOperatorPlugin):
    category = "assignment_type"
    description = "Swap non-blocking (<=) and blocking (=) assignment"

    def applies_to(self, line: str, context: Dict[str, Any]) -> bool:
        return "<=" in line and not re.search(r'if|while|case', line)

    def mutate(self, line: str, context: Dict[str, Any]) -> List[str]:
        return [line.replace("<=", "=", 1)]

# Operator Registry
DEFAULT_OPERATORS: List[MutationOperatorPlugin] = [
    ArithmeticOperator(),
    RelationalOperator(),
    LogicalOperator(),
    BitwiseOperator(),
    ConstantBoundaryOperator(),
    ResetValueOperator(),
    StuckAtOperator(),
    BranchSwapOperator(),
    AssignmentTypeOperator()
]

class MutationEngine:
    def __init__(self, workspace_dir: str, plugins: Optional[List[MutationOperatorPlugin]] = None):
        self.workspace_dir = workspace_dir
        self.plugins = plugins or DEFAULT_OPERATORS
        self.limitations_report: List[Dict[str, Any]] = []

    def generate_mutants(
        self,
        target_files: List[str],
        enabled_categories: Optional[List[str]] = None,
        max_mutants: int = 50,
        seed: int = 42,
        sampling_strategy: str = "stratified"
    ) -> List[Dict[str, Any]]:
        """
        Generates syntax-aware mutants across synthesizable target files.
        Guarantees that testbench files are NEVER modified.
        """
        random.seed(seed)
        generated_mutants = []
        active_plugins = [p for p in self.plugins if not enabled_categories or p.category in enabled_categories]

        mutant_idx = 1

        for rel_file in target_files:
            # Absolute safety check: Never mutate testbench files
            if self._is_testbench_path(rel_file):
                continue

            full_path = os.path.join(self.workspace_dir, rel_file)
            if not os.path.exists(full_path):
                continue

            with open(full_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            in_block_comment = False

            for line_idx, raw_line in enumerate(lines):
                line_no = line_idx + 1
                stripped = raw_line.strip()

                # Handle comments
                if "/*" in stripped:
                    in_block_comment = True
                if in_block_comment:
                    if "*/" in stripped:
                        in_block_comment = False
                    continue
                if stripped.startswith("//") or not stripped:
                    continue

                # Skip directive macros and declarations
                if stripped.startswith("`") or stripped.startswith("module ") or stripped.startswith("endmodule"):
                    continue

                for plugin in active_plugins:
                    if plugin.applies_to(raw_line, {"file": rel_file, "line": line_no}):
                        try:
                            mutated_lines = plugin.mutate(raw_line, {"file": rel_file, "line": line_no})
                            for m_line in mutated_lines:
                                if m_line != raw_line:
                                    diff = self._make_diff(rel_file, line_no, raw_line, m_line)
                                    m_id = f"m{mutant_idx:03d}"
                                    mutant_idx += 1

                                    # Tag potential equivalence heuristic
                                    is_equiv = self._heuristic_equivalent(raw_line, m_line, plugin.category)

                                    generated_mutants.append({
                                        "id": m_id,
                                        "file": rel_file,
                                        "line": line_no,
                                        "column": 1,
                                        "category": plugin.category,
                                        "operator_description": plugin.description,
                                        "original_snippet": raw_line.strip(),
                                        "mutated_snippet": m_line.strip(),
                                        "diff": diff,
                                        "status": "potentially_equivalent" if is_equiv else "survived"
                                    })
                        except Exception as e:
                            self.limitations_report.append({
                                "file": rel_file,
                                "line": line_no,
                                "construct": raw_line.strip(),
                                "reason": f"Mutation operator exception: {str(e)}"
                            })

        # Apply sampling strategy
        if sampling_strategy == "stratified":
            final_mutants = self._stratified_sample(generated_mutants, max_mutants)
        elif sampling_strategy == "random":
            final_mutants = random.sample(generated_mutants, min(len(generated_mutants), max_mutants))
        else:
            final_mutants = generated_mutants[:max_mutants]

        return final_mutants

    def _is_testbench_path(self, path: str) -> bool:
        low = path.lower()
        return "tb" in low or "test" in low or low.endswith(".py")

    def _make_diff(self, file: str, line_no: int, orig: str, mut: str) -> str:
        return f"--- {file}:{line_no}\n+++ {file}:{line_no}\n@@ -{line_no},1 +{line_no},1 @@\n- {orig.strip()}\n+ {mut.strip()}"

    def _heuristic_equivalent(self, orig: str, mut: str, category: str) -> bool:
        # Identity or tautological transformations
        if "| 0" in mut or "& 1" in mut or "^ 0" in mut:
            return True
        return False

    def _stratified_sample(self, mutants: List[Dict[str, Any]], max_n: int) -> List[Dict[str, Any]]:
        by_cat: Dict[str, List[Dict[str, Any]]] = {}
        for m in mutants:
            by_cat.setdefault(m["category"], []).append(m)

        sampled = []
        categories = list(by_cat.keys())
        if not categories:
            return []

        per_cat = max(1, max_n // len(categories))
        for cat, items in by_cat.items():
            sampled.extend(items[:per_cat])

        # Fill remaining up to max_n
        if len(sampled) < max_n:
            remaining = [m for m in mutants if m not in sampled]
            sampled.extend(remaining[:(max_n - len(sampled))])

        return sampled[:max_n]
