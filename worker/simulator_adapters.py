"""
Simulator and Testbench execution adapters for MutaSelect AI.
Executes ModelSim, Xilinx Vivado Simulator, Icarus Verilog, and Verilator inside isolated sandboxes.
Zero mock simulations: real process execution, real exit codes, real assertion checks.
"""

import os
import subprocess
import shutil
import glob
import time
from typing import Dict, Any, List, Optional, Tuple

class SimulatorExecutionResult:
    def __init__(self, passed: bool, exit_code: int, stdout: str, stderr: str, runtime_ms: int, command: str, error_stage: Optional[str] = None):
        self.passed = passed
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.runtime_ms = runtime_ms
        self.command = command
        self.error_stage = error_stage

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "runtime_ms": self.runtime_ms,
            "command": self.command,
            "error_stage": self.error_stage
        }

class SimulatorAdapter:
    name: str = "base"
    custom_bin_dir: Optional[str] = None

    def set_custom_path(self, bin_path: str):
        self.custom_bin_dir = bin_path.strip() if bin_path else None

    def is_available(self) -> Tuple[bool, str, Dict[str, Any]]:
        raise NotImplementedError

    def test_connection(self) -> Dict[str, Any]:
        raise NotImplementedError

    def compile(self, workdir: str, top_module: str, files: List[str], defines: Dict[str, str]) -> SimulatorExecutionResult:
        raise NotImplementedError

    def run_test(self, workdir: str, top_module: str, test_id: str, test_filter: str, timeout_sec: int) -> SimulatorExecutionResult:
        raise NotImplementedError


class ModelSimAdapter(SimulatorAdapter):
    """
    Adapter for Mentor Graphics / Siemens ModelSim and QuestaSim.
    Executes standard EDA batch simulation:
      1. vlib work
      2. vlog -sv <files...>
      3. vsim -c -do "run -all; quit -f" work.<top_module>
    """
    name = "modelsim"

    def _find_bin(self, binary_name: str) -> Optional[str]:
        # 1. Check custom path if provided
        if self.custom_bin_dir and os.path.isdir(self.custom_bin_dir):
            candidate = os.path.join(self.custom_bin_dir, binary_name)
            if os.path.isfile(candidate):
                return candidate
            if os.name == 'nt' and os.path.isfile(candidate + ".exe"):
                return candidate + ".exe"

        # 2. Check system PATH
        path_which = shutil.which(binary_name)
        if path_which:
            return path_which

        # 3. Check common Windows installation paths
        windows_patterns = [
            r"C:\intelFPGA\*\modelsim_ase\win32aloem",
            r"C:\intelFPGA_lite\*\modelsim_ase\win32aloem",
            r"C:\intelFPGA\*\modelsim_ae\win32aloem",
            r"C:\intelFPGA_lite\*\modelsim_ae\win32aloem",
            r"C:\modeltech64_*\win64",
            r"C:\modeltech_*\win32",
            r"C:\questasim64_*\win64",
            r"C:\questasim_*\win32",
            r"C:\Microsemi\*\ModelSim\win32"
        ]
        for pattern in windows_patterns:
            matches = glob.glob(pattern)
            for m in sorted(matches, reverse=True):
                cand = os.path.join(m, f"{binary_name}.exe")
                if os.path.isfile(cand):
                    return cand

        # 4. Check common Linux paths
        linux_patterns = [
            "/opt/intelFPGA/*/modelsim_ase/bin",
            "/opt/modelsim/*/bin",
            "/opt/questasim/*/bin"
        ]
        for pattern in linux_patterns:
            matches = glob.glob(pattern)
            for m in sorted(matches, reverse=True):
                cand = os.path.join(m, binary_name)
                if os.path.isfile(cand):
                    return cand

        return None

    def is_available(self) -> Tuple[bool, str, Dict[str, Any]]:
        vsim_bin = self._find_bin("vsim")
        vlog_bin = self._find_bin("vlog")
        vlib_bin = self._find_bin("vlib")

        details = {
            "vsim": vsim_bin,
            "vlog": vlog_bin,
            "vlib": vlib_bin,
            "status": "MISSING_EXECUTABLE",
            "version": "",
            "license_status": "UNKNOWN"
        }

        if not vsim_bin or not vlog_bin:
            return False, "ModelSim executables (vsim/vlog) not found in PATH or standard installation directories.", details

        # Real version check command execution
        try:
            res = subprocess.run([vsim_bin, "-version"], capture_output=True, text=True, timeout=8)
            out = (res.stdout + "\n" + res.stderr).strip()
            details["version"] = out.split("\n")[0] if out else "ModelSim"

            # License detection
            if "Unable to checkout license" in out or "No license for feature" in out or "FLEXlm error" in out:
                details["license_status"] = "LICENSE_UNAVAILABLE"
                details["status"] = "LICENSE_UNAVAILABLE"
                return False, f"ModelSim license check failed: {out}", details

            if res.returncode == 0:
                details["license_status"] = "VALID"
                details["status"] = "INSTALLED_ACCESSIBLE"
                return True, details["version"], details
            else:
                details["status"] = "EXECUTION_FAILURE"
                return False, f"vsim exited with code {res.returncode}: {out}", details
        except Exception as e:
            details["status"] = "EXECUTION_FAILURE"
            return False, str(e), details

    def test_connection(self) -> Dict[str, Any]:
        vsim_bin = self._find_bin("vsim")
        if not vsim_bin:
            return {
                "success": False,
                "status": "MISSING_EXECUTABLE",
                "message": "ModelSim executable (vsim) not found. Please install ModelSim or configure the custom path to the win32aloem / bin folder.",
                "command": "vsim -version",
                "stdout": "",
                "stderr": "Executable not found",
                "exit_code": 127
            }

        try:
            cmd = [vsim_bin, "-version"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            output = res.stdout + (f"\n{res.stderr}" if res.stderr else "")
            success = res.returncode == 0 and "Unable to checkout license" not in output
            status = "INSTALLED_ACCESSIBLE" if success else ("LICENSE_UNAVAILABLE" if "license" in output.lower() else "EXECUTION_FAILURE")
            return {
                "success": success,
                "status": status,
                "message": output.strip().split("\n")[0] if success else "Execution returned non-zero code or license error",
                "command": " ".join(cmd),
                "stdout": res.stdout,
                "stderr": res.stderr,
                "exit_code": res.returncode
            }
        except Exception as e:
            return {
                "success": False,
                "status": "EXECUTION_FAILURE",
                "message": str(e),
                "command": f"{vsim_bin} -version",
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1
            }

    def compile(self, workdir: str, top_module: str, files: List[str], defines: Dict[str, str]) -> SimulatorExecutionResult:
        start_time = time.time()
        vlib_bin = self._find_bin("vlib") or "vlib"
        vlog_bin = self._find_bin("vlog") or "vlog"

        # Step 1: Create work library if not present
        work_path = os.path.join(workdir, "work")
        if not os.path.exists(work_path):
            try:
                subprocess.run([vlib_bin, "work"], cwd=workdir, capture_output=True, text=True, timeout=10)
            except Exception as e:
                return SimulatorExecutionResult(False, -1, "", f"Failed to initialize ModelSim work library via vlib: {str(e)}", 0, f"{vlib_bin} work", error_stage="vlib")

        # Step 2: Compile Verilog / SystemVerilog
        cmd = [vlog_bin, "-sv", "-work", "work", "+acc=rn"]
        for k, v in defines.items():
            cmd.append(f"+define+{k}={v}")
        cmd.extend(files)

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=60)
            runtime_ms = int((time.time() - start_time) * 1000)
            passed = res.returncode == 0 and "** Error" not in res.stdout
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str, error_stage=None if passed else "vlog_compilation")
        except subprocess.TimeoutExpired:
            return SimulatorExecutionResult(False, -1, "", "ModelSim vlog compilation timed out after 60s", 60000, cmd_str, error_stage="vlog_timeout")
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str, error_stage="vlog_exception")

    def run_test(self, workdir: str, top_module: str, test_id: str, test_filter: str, timeout_sec: int) -> SimulatorExecutionResult:
        start_time = time.time()
        vsim_bin = self._find_bin("vsim") or "vsim"

        # ModelSim batch execution command: -c (command-line), -do "run -all; quit -f"
        cmd = [vsim_bin, "-c", "-do", "run -all; quit -f", f"work.{top_module}"]
        if test_filter:
            cmd.append(test_filter)

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=timeout_sec)
            runtime_ms = int((time.time() - start_time) * 1000)
            output = res.stdout + "\n" + res.stderr
            has_error = (
                "** Error" in output or
                "** Fatal" in output or
                "$fatal" in output or
                "[FAIL]" in output or
                res.returncode != 0
            )
            passed = not has_error
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str)
        except subprocess.TimeoutExpired:
            return SimulatorExecutionResult(False, -1, "", f"ModelSim simulation timed out after {timeout_sec}s", timeout_sec * 1000, cmd_str, error_stage="vsim_timeout")
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str, error_stage="vsim_exception")


class VivadoAdapter(SimulatorAdapter):
    """
    Adapter for Xilinx Vivado Simulator.
    Executes standard Vivado batch simulation:
      1. xvlog -sv <files...>
      2. xelab -debug typical -top <top_module> -s sim_snapshot
      3. xsim sim_snapshot -R
    """
    name = "vivado"

    def _find_bin(self, binary_name: str) -> Optional[str]:
        # 1. Custom path
        if self.custom_bin_dir and os.path.isdir(self.custom_bin_dir):
            cand = os.path.join(self.custom_bin_dir, binary_name)
            if os.path.isfile(cand):
                return cand
            if os.name == 'nt' and os.path.isfile(cand + ".bat"):
                return cand + ".bat"
            if os.name == 'nt' and os.path.isfile(cand + ".exe"):
                return cand + ".exe"

        # 2. PATH
        path_which = shutil.which(binary_name)
        if path_which:
            return path_which

        # 3. Common Windows paths
        win_patterns = [
            r"C:\Xilinx\Vivado\*\bin",
            r"C:\Xilinx\Vivado_Lab\*\bin"
        ]
        for pattern in win_patterns:
            matches = glob.glob(pattern)
            for m in sorted(matches, reverse=True):
                for ext in [".bat", ".exe", ""]:
                    cand = os.path.join(m, f"{binary_name}{ext}")
                    if os.path.isfile(cand):
                        return cand

        # 4. Common Linux paths
        linux_patterns = [
            "/tools/Xilinx/Vivado/*/bin",
            "/opt/Xilinx/Vivado/*/bin"
        ]
        for pattern in linux_patterns:
            matches = glob.glob(pattern)
            for m in sorted(matches, reverse=True):
                cand = os.path.join(m, binary_name)
                if os.path.isfile(cand):
                    return cand

        return None

    def is_available(self) -> Tuple[bool, str, Dict[str, Any]]:
        xvlog_bin = self._find_bin("xvlog")
        xelab_bin = self._find_bin("xelab")
        xsim_bin = self._find_bin("xsim")

        details = {
            "xvlog": xvlog_bin,
            "xelab": xelab_bin,
            "xsim": xsim_bin,
            "status": "MISSING_EXECUTABLE",
            "version": "",
            "license_status": "UNKNOWN"
        }

        if not xvlog_bin or not xelab_bin or not xsim_bin:
            return False, "Vivado executables (xvlog/xelab/xsim) not found in PATH or standard installation directories.", details

        try:
            res = subprocess.run([xvlog_bin, "--version"], capture_output=True, text=True, timeout=8)
            out = (res.stdout + "\n" + res.stderr).strip()
            details["version"] = out.split("\n")[0] if out else "Vivado"
            if res.returncode == 0:
                details["license_status"] = "VALID"
                details["status"] = "INSTALLED_ACCESSIBLE"
                return True, details["version"], details
            else:
                details["status"] = "EXECUTION_FAILURE"
                return False, f"xvlog exited with code {res.returncode}", details
        except Exception as e:
            details["status"] = "EXECUTION_FAILURE"
            return False, str(e), details

    def test_connection(self) -> Dict[str, Any]:
        xvlog_bin = self._find_bin("xvlog")
        if not xvlog_bin:
            return {
                "success": False,
                "status": "MISSING_EXECUTABLE",
                "message": "Vivado executable (xvlog) not found. Configure path to your Xilinx\\Vivado\\<version>\\bin folder.",
                "command": "xvlog --version",
                "stdout": "",
                "stderr": "Executable not found",
                "exit_code": 127
            }

        try:
            cmd = [xvlog_bin, "--version"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            output = res.stdout + (f"\n{res.stderr}" if res.stderr else "")
            success = res.returncode == 0
            status = "INSTALLED_ACCESSIBLE" if success else "EXECUTION_FAILURE"
            return {
                "success": success,
                "status": status,
                "message": output.strip().split("\n")[0] if success else "Execution returned non-zero code",
                "command": " ".join(cmd),
                "stdout": res.stdout,
                "stderr": res.stderr,
                "exit_code": res.returncode
            }
        except Exception as e:
            return {
                "success": False,
                "status": "EXECUTION_FAILURE",
                "message": str(e),
                "command": f"{xvlog_bin} --version",
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1
            }

    def compile(self, workdir: str, top_module: str, files: List[str], defines: Dict[str, str]) -> SimulatorExecutionResult:
        start_time = time.time()
        xvlog_bin = self._find_bin("xvlog") or "xvlog"
        xelab_bin = self._find_bin("xelab") or "xelab"

        # 1. xvlog compilation
        xvlog_cmd = [xvlog_bin, "-sv"]
        for k, v in defines.items():
            xvlog_cmd.extend(["-d", f"{k}={v}"])
        xvlog_cmd.extend(files)

        xvlog_str = " ".join(xvlog_cmd)
        try:
            res_vlog = subprocess.run(xvlog_cmd, cwd=workdir, capture_output=True, text=True, timeout=60)
            if res_vlog.returncode != 0 or "ERROR:" in res_vlog.stdout:
                runtime_ms = int((time.time() - start_time) * 1000)
                return SimulatorExecutionResult(False, res_vlog.returncode, res_vlog.stdout, res_vlog.stderr, runtime_ms, xvlog_str, error_stage="xvlog")

            # 2. xelab elaboration
            snapshot_name = "sim_snapshot"
            xelab_cmd = [xelab_bin, "-debug", "typical", "-top", top_module, "-s", snapshot_name]
            xelab_str = " ".join(xelab_cmd)
            res_elab = subprocess.run(xelab_cmd, cwd=workdir, capture_output=True, text=True, timeout=90)
            runtime_ms = int((time.time() - start_time) * 1000)

            passed = res_elab.returncode == 0 and "ERROR:" not in res_elab.stdout
            combined_out = f"[XVLOG]\n{res_vlog.stdout}\n[XELAB]\n{res_elab.stdout}"
            combined_err = f"{res_vlog.stderr}\n{res_elab.stderr}".strip()
            return SimulatorExecutionResult(passed, res_elab.returncode, combined_out, combined_err, runtime_ms, f"{xvlog_str} && {xelab_str}", error_stage=None if passed else "xelab")
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, xvlog_str, error_stage="vivado_exception")

    def run_test(self, workdir: str, top_module: str, test_id: str, test_filter: str, timeout_sec: int) -> SimulatorExecutionResult:
        start_time = time.time()
        xsim_bin = self._find_bin("xsim") or "xsim"
        snapshot_name = "sim_snapshot"

        # xsim sim_snapshot -R (runs simulation to completion)
        cmd = [xsim_bin, snapshot_name, "-R"]
        if test_filter:
            cmd.extend(["-testplusarg", test_filter])

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=timeout_sec)
            runtime_ms = int((time.time() - start_time) * 1000)
            output = res.stdout + "\n" + res.stderr
            has_error = (
                "FATAL_ERROR" in output or
                "ERROR:" in output or
                "[FAIL]" in output or
                res.returncode != 0
            )
            passed = not has_error
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str)
        except subprocess.TimeoutExpired:
            return SimulatorExecutionResult(False, -1, "", f"Vivado xsim simulation timed out after {timeout_sec}s", timeout_sec * 1000, cmd_str, error_stage="xsim_timeout")
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str, error_stage="xsim_exception")


class IcarusAdapter(SimulatorAdapter):
    name = "iverilog"

    def is_available(self) -> Tuple[bool, str, Dict[str, Any]]:
        path = shutil.which("iverilog")
        details = {"path": path, "status": "INSTALLED_ACCESSIBLE" if path else "MISSING_EXECUTABLE"}
        if not path:
            return False, "iverilog binary not found in PATH", details
        try:
            res = subprocess.run(["iverilog", "-V"], capture_output=True, text=True, timeout=5)
            version_line = res.stdout.split("\n")[0] if res.stdout else "Icarus Verilog"
            details["version"] = version_line
            return True, version_line, details
        except Exception as e:
            details["status"] = "EXECUTION_FAILURE"
            return False, str(e), details

    def test_connection(self) -> Dict[str, Any]:
        path = shutil.which("iverilog")
        if not path:
            return {"success": False, "status": "MISSING_EXECUTABLE", "message": "iverilog not found in PATH", "command": "iverilog -V", "exit_code": 127}
        try:
            res = subprocess.run(["iverilog", "-V"], capture_output=True, text=True, timeout=5)
            return {"success": res.returncode == 0, "status": "INSTALLED_ACCESSIBLE", "message": res.stdout.split("\n")[0], "command": "iverilog -V", "stdout": res.stdout, "stderr": res.stderr, "exit_code": res.returncode}
        except Exception as e:
            return {"success": False, "status": "EXECUTION_FAILURE", "message": str(e), "command": "iverilog -V", "exit_code": -1}

    def compile(self, workdir: str, top_module: str, files: List[str], defines: Dict[str, str]) -> SimulatorExecutionResult:
        start_time = time.time()
        out_vvp = os.path.join(workdir, "sim.vvp")
        cmd = ["iverilog", "-g2012", "-o", out_vvp]
        for k, v in defines.items():
            cmd.append(f"-D{k}={v}")
        if top_module:
            cmd.extend(["-s", top_module])
        cmd.extend(files)

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=45)
            runtime_ms = int((time.time() - start_time) * 1000)
            passed = res.returncode == 0 and os.path.exists(out_vvp)
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str)
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str)

    def run_test(self, workdir: str, top_module: str, test_id: str, test_filter: str, timeout_sec: int) -> SimulatorExecutionResult:
        start_time = time.time()
        out_vvp = os.path.join(workdir, "sim.vvp")
        cmd = ["vvp", out_vvp]
        if test_filter:
            cmd.append(test_filter)

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=timeout_sec)
            runtime_ms = int((time.time() - start_time) * 1000)
            passed = res.returncode == 0 and "[FAIL]" not in res.stdout and "ERROR" not in res.stdout
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str)
        except subprocess.TimeoutExpired:
            return SimulatorExecutionResult(False, -1, "", f"Timeout after {timeout_sec}s", timeout_sec * 1000, cmd_str)
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str)


class VerilatorAdapter(SimulatorAdapter):
    name = "verilator"

    def is_available(self) -> Tuple[bool, str, Dict[str, Any]]:
        path = shutil.which("verilator")
        details = {"path": path, "status": "INSTALLED_ACCESSIBLE" if path else "MISSING_EXECUTABLE"}
        if not path:
            return False, "Verilator binary not found in PATH", details
        try:
            res = subprocess.run(["verilator", "--version"], capture_output=True, text=True, timeout=5)
            version_line = res.stdout.strip()
            details["version"] = version_line
            return True, version_line, details
        except Exception as e:
            details["status"] = "EXECUTION_FAILURE"
            return False, str(e), details

    def test_connection(self) -> Dict[str, Any]:
        path = shutil.which("verilator")
        if not path:
            return {"success": False, "status": "MISSING_EXECUTABLE", "message": "verilator not found in PATH", "command": "verilator --version", "exit_code": 127}
        try:
            res = subprocess.run(["verilator", "--version"], capture_output=True, text=True, timeout=5)
            return {"success": res.returncode == 0, "status": "INSTALLED_ACCESSIBLE", "message": res.stdout.strip(), "command": "verilator --version", "stdout": res.stdout, "stderr": res.stderr, "exit_code": res.returncode}
        except Exception as e:
            return {"success": False, "status": "EXECUTION_FAILURE", "message": str(e), "command": "verilator --version", "exit_code": -1}

    def compile(self, workdir: str, top_module: str, files: List[str], defines: Dict[str, str]) -> SimulatorExecutionResult:
        start_time = time.time()
        cmd = ["verilator", "--binary", "--timing", "-j", "2", "-Wall", "-Wno-fatal"]
        for k, v in defines.items():
            cmd.append(f"-D{k}={v}")
        cmd.extend(["--top-module", top_module])
        cmd.extend(files)

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=60)
            runtime_ms = int((time.time() - start_time) * 1000)
            passed = res.returncode == 0
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str)
        except subprocess.TimeoutExpired:
            return SimulatorExecutionResult(False, -1, "", "Compilation timed out after 60s", 60000, cmd_str)
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str)

    def run_test(self, workdir: str, top_module: str, test_id: str, test_filter: str, timeout_sec: int) -> SimulatorExecutionResult:
        start_time = time.time()
        bin_path = os.path.join(workdir, "obj_dir", f"V{top_module}")
        if not os.path.exists(bin_path):
            bin_path = os.path.join(workdir, f"V{top_module}")

        cmd = [bin_path]
        if test_filter and test_filter.startswith("+"):
            cmd.append(test_filter)

        cmd_str = " ".join(cmd)
        try:
            res = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=timeout_sec)
            runtime_ms = int((time.time() - start_time) * 1000)
            passed = res.returncode == 0 and "FAIL" not in res.stdout and "$fatal" not in res.stdout
            return SimulatorExecutionResult(passed, res.returncode, res.stdout, res.stderr, runtime_ms, cmd_str)
        except subprocess.TimeoutExpired:
            return SimulatorExecutionResult(False, -1, "", f"Simulation timed out after {timeout_sec}s", timeout_sec * 1000, cmd_str)
        except Exception as e:
            return SimulatorExecutionResult(False, -1, "", str(e), 0, cmd_str)
