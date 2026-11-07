"""
DesignAnalyzer: Universal RTL & Testbench Structural Parser for MutaSelect AI.
Parses Verilog/SystemVerilog files, constructs module hierarchy, dependency DAG,
extracts ports, parameters, construct inventories, and classifies testbenches.
"""

import os
import re
from typing import List, Dict, Any, Optional

class DesignAnalyzer:
    def __init__(self, workspace_dir: str):
        self.workspace_dir = workspace_dir

    def analyze_files(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Analyzes all given Verilog, SystemVerilog, and header files.
        Extracts modules, hierarchy, compile order, and testbenches.
        """
        modules = []
        packages = []
        includes = []
        defines = {}
        unsupported_constructs = []
        file_metadata = []

        all_instantiations = set()

        for rel_path in file_paths:
            full_path = os.path.join(self.workspace_dir, rel_path)
            if not os.path.exists(full_path):
                continue

            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            is_tb = self._is_testbench_content(rel_path, content)
            file_meta = {
                "name": os.path.basename(rel_path),
                "path": rel_path,
                "size": len(content),
                "is_synthesizable": not is_tb and (rel_path.endswith((".v", ".sv"))),
                "is_testbench": is_tb
            }
            file_metadata.append(file_meta)

            parsed_file = self._parse_rtl_file(rel_path, content)
            modules.extend(parsed_file["modules"])
            packages.extend(parsed_file["packages"])
            includes.extend(parsed_file["includes"])
            defines.update(parsed_file["defines"])
            unsupported_constructs.extend(parsed_file["unsupported"])

            for mod in parsed_file["modules"]:
                for inst in mod.get("instantiations", []):
                    all_instantiations.add(inst["module_name"])

        # Rank candidate top modules (uninstantiated synthesizable modules)
        candidate_tops = []
        for mod in modules:
            if mod["is_testbench"]:
                continue
            is_instantiated = mod["name"] in all_instantiations
            score = 10
            reason = "Root module (uninstantiated by any other module in file list)"
            if is_instantiated:
                score -= 8
                reason = "Instantiated as child submodule"
            if len(mod["ports"]) > 0:
                score += 5
            if "top" in mod["name"].lower() or "core" in mod["name"].lower():
                score += 4
            candidate_tops.append({
                "name": mod["name"],
                "score": score,
                "reason": reason,
                "file": mod["file"]
            })

        candidate_tops.sort(key=lambda x: x["score"], reverse=True)
        selected_top = candidate_tops[0]["name"] if candidate_tops else (modules[0]["name"] if modules else "")

        # Compile order resolution based on package and include dependencies
        compile_order = self._resolve_compile_order(file_metadata, includes)

        return {
            "modules": modules,
            "packages": list(set(packages)),
            "includes": list(set(includes)),
            "defines": defines,
            "candidate_top_modules": candidate_tops,
            "selected_top_module": selected_top,
            "compile_order": compile_order,
            "unsupported_constructs": unsupported_constructs,
            "files": file_metadata
        }

    def detect_testbench(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Classifies testbench type: cocotb, SystemVerilog self-checking, or custom command.
        Enumerates individual test routines.
        """
        tests = []
        tb_type = "unknown"
        cocotb_module = None

        for rel_path in file_paths:
            full_path = os.path.join(self.workspace_dir, rel_path)
            if not os.path.exists(full_path):
                continue
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            # 1. Check for cocotb tests
            if rel_path.endswith(".py") or "cocotb" in content:
                cocotb_matches = re.findall(r"@cocotb\.test\([^\)]*\)\s*(?:async\s+)?def\s+([a-zA-Z_0-9]+)", content)
                if cocotb_matches:
                    tb_type = "cocotb"
                    cocotb_module = os.path.splitext(os.path.basename(rel_path))[0]
                    for test_name in cocotb_matches:
                        tests.append({
                            "id": f"cocotb_{test_name}",
                            "name": test_name,
                            "type": "cocotb",
                            "file": rel_path,
                            "command_or_filter": test_name,
                            "estimated_runtime_ms": 200
                        })

            # 2. Check for SystemVerilog self-checking plusargs / tasks
            if tb_type == "unknown" and rel_path.endswith((".sv", ".v")):
                if "$value$plusargs" in content or "$test$plusargs" in content:
                    plusarg_tests = re.findall(r'testname\s*==\s*"([^"]+)"', content)
                    if plusarg_tests:
                        tb_type = "systemverilog"
                        for p_test in set(plusarg_tests):
                            if p_test != "all":
                                tests.append({
                                    "id": f"sv_{p_test}",
                                    "name": p_test,
                                    "type": "systemverilog",
                                    "file": rel_path,
                                    "command_or_filter": f"+TESTNAME={p_test}",
                                    "estimated_runtime_ms": 250
                                })

                # If single self-checking testbench with $fatal / $finish
                if tb_type == "unknown" and ("$fatal" in content or "$error" in content or "[PASS]" in content):
                    tb_type = "verilog_self_checking"
                    tests.append({
                        "id": f"tb_{os.path.basename(rel_path)}",
                        "name": f"Run {os.path.basename(rel_path)}",
                        "type": "verilog_self_checking",
                        "file": rel_path,
                        "command_or_filter": rel_path,
                        "estimated_runtime_ms": 300
                    })

        if not tests:
            tb_type = "custom_command"
            tests.append({
                "id": "custom_default_test",
                "name": "Default Test Target",
                "type": "custom_command",
                "file": file_paths[0] if file_paths else "",
                "command_or_filter": "{workdir}/run_test.sh",
                "estimated_runtime_ms": 500
            })

        return {
            "testbench_type": tb_type,
            "tests": tests,
            "cocotb_module": cocotb_module
        }

    def _is_testbench_content(self, filename: str, content: str) -> bool:
        if filename.endswith(".py"):
            return True
        if "tb_" in filename or "_tb." in filename or "test_" in filename:
            return True
        if re.search(r"\binitial\b[\s\S]*?\$(?:finish|fatal|stop)", content):
            return True
        if "@cocotb.test" in content:
            return True
        return False

    def _parse_rtl_file(self, rel_path: str, content: str) -> Dict[str, Any]:
        modules = []
        packages = []
        includes = []
        defines = {}
        unsupported = []

        lines = content.split("\n")

        for idx, line in enumerate(lines):
            line_no = idx + 1
            s = line.strip()

            # Directives
            inc_match = re.match(r'^`include\s+["<]([^">]+)[">]', s)
            if inc_match:
                includes.append(inc_match.group(1))

            def_match = re.match(r'^`define\s+([a-zA-Z_0-9]+)(?:\s+(.+))?', s)
            if def_match:
                defines[def_match.group(1)] = def_match.group(2) or "1"

            # Check unsupported constructs
            if re.search(r'\bdefparam\b', s):
                unsupported.append({
                    "file": rel_path,
                    "line": line_no,
                    "construct": "defparam",
                    "reason": "Hierarchical defparam is discouraged in synthesizable SV."
                })
            if re.search(r'import\s+"DPI-C"', s):
                unsupported.append({
                    "file": rel_path,
                    "line": line_no,
                    "construct": "DPI-C function",
                    "reason": "Direct C/C++ foreign function interfaces require explicit shared library binding."
                })

            # Packages
            pkg_match = re.match(r'^package\s+([a-zA-Z_0-9]+);', s)
            if pkg_match:
                packages.append(pkg_match.group(1))

        # Module matching (multiline aware)
        mod_pattern = re.compile(
            r'module\s+([a-zA-Z_0-9]+)\s*(?:#\s*\(([\s\S]*?)\))?\s*(?:\(([\s\S]*?)\))?\s*;([\s\S]*?)endmodule',
            re.MULTILINE
        )

        for match in mod_pattern.finditer(content):
            mod_name = match.group(1)
            raw_params = match.group(2) or ""
            raw_ports = match.group(3) or ""
            mod_body = match.group(4) or ""

            # Calculate line range
            start_pos = match.start()
            start_line = content[:start_pos].count("\n") + 1
            end_line = start_line + match.group(0).count("\n")

            ports = self._extract_ports(raw_ports, mod_body)
            parameters = self._extract_parameters(raw_params, mod_body)
            instantiations = self._extract_instantiations(mod_body)

            # Construct inventory
            always_count = len(re.findall(r'\balways(?:_ff|_comb|_latch)?\b', mod_body))
            case_count = len(re.findall(r'\bcase\s*\(', mod_body))
            generate_count = len(re.findall(r'\bgenerate\b', mod_body))
            fsm_detected = bool(re.search(r'state\s*<=|next_state\s*=|case\s*\(\s*(?:curr_)?state\)', mod_body, re.I))
            counter_count = len(re.findall(r'\b([a-zA-Z_0-9]+)\s*<=\s*\1\s*[+-]', mod_body, re.I))

            is_tb = self._is_testbench_content(rel_path, mod_body) or "tb" in mod_name.lower()

            modules.append({
                "name": mod_name,
                "file": rel_path,
                "start_line": start_line,
                "end_line": end_line,
                "ports": ports,
                "parameters": parameters,
                "instantiations": instantiations,
                "is_top_candidate": False,
                "is_testbench": is_tb,
                "constructs": {
                    "always_blocks": always_count,
                    "case_statements": case_count,
                    "generate_blocks": generate_count,
                    "fsm_detected": fsm_detected,
                    "counters_detected": counter_count
                }
            })

        return {
            "modules": modules,
            "packages": packages,
            "includes": includes,
            "defines": defines,
            "unsupported": unsupported
        }

    def _extract_ports(self, raw_header_ports: str, body: str) -> List[Dict[str, Any]]:
        ports = []
        combined = raw_header_ports + "\n" + body
        port_regex = re.compile(
            r'\b(input|output|inout)\s+(?:wire|reg|logic)?\s*(?:\[([^\]]+)\])?\s*([a-zA-Z_0-9,\s]+?)(?:;|\)|,)',
            re.MULTILINE
        )
        for match in port_regex.finditer(combined):
            direction = match.group(1)
            width = f"[{match.group(2).strip()}]" if match.group(2) else "1"
            names = [n.strip() for n in match.group(3).split(",") if n.strip()]
            for name in names:
                if not any(p["name"] == name for p in ports) and re.match(r'^[a-zA-Z_0-9]+$', name):
                    ports.append({
                        "name": name,
                        "direction": direction,
                        "width": width
                    })
        return ports

    def _extract_parameters(self, raw_header_params: str, body: str) -> List[Dict[str, Any]]:
        params = []
        combined = raw_header_params + "\n" + body
        param_regex = re.compile(r'parameter\s+(?:[a-zA-Z_0-9]+\s+)?([a-zA-Z_0-9]+)\s*=\s*([^,;\)]+)')
        for match in param_regex.finditer(combined):
            params.append({
                "name": match.group(1).strip(),
                "default_value": match.group(2).strip()
            })
        return params

    def _extract_instantiations(self, body: str) -> List[Dict[str, Any]]:
        instantiations = []
        keywords = {
            'module', 'endmodule', 'always', 'always_ff', 'always_comb',
            'initial', 'function', 'task', 'case', 'if', 'assign', 'generate', 'begin', 'end'
        }
        inst_regex = re.compile(r'\b([a-zA-Z_0-9]+)\s*(?:#\s*\([\s\S]*?\))?\s*([a-zA-Z_0-9]+)\s*\(')
        for match in inst_regex.finditer(body):
            mod_name = match.group(1)
            inst_name = match.group(2)
            if mod_name not in keywords:
                instantiations.append({
                    "module_name": mod_name,
                    "instance_name": inst_name
                })
        return instantiations

    def _resolve_compile_order(self, files: List[Dict[str, Any]], includes: List[str]) -> List[str]:
        # Synthesizable RTL packages first, then headers, then modules
        synth_files = [f["path"] for f in files if f["is_synthesizable"]]
        ordered = []
        # Packages first
        for path in synth_files:
            if "pkg" in path.lower():
                ordered.append(path)
        for path in synth_files:
            if path not in ordered:
                ordered.append(path)
        return ordered
