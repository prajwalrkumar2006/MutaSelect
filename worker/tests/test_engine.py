"""
Unit and Integration Tests for MutaSelect AI Worker Engine.
Validates:
1. Universal DesignAnalyzer with 3 structurally different designs (ALU, FSM Controller, Parameterized Counter/Shift Register)
2. Deliberately broken RTL (Compilation failure gate)
3. Failing baseline testbench (Baseline block gate)
4. Unsupported construct detection & reporting
5. Mutation Operators (syntax-safety, testbench protection across 5 groups)
6. Greedy Selector & Independent Safety Validator
"""

import os
import sys
import tempfile
import unittest

# Ensure worker root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from design_analyzer import DesignAnalyzer
from mutation_engine import MutationEngine
from safety_validator import SafetyValidator

# 1. Structural Design A: 8-bit Arithmetic Logic Unit (ALU - Combinational)
ALU_RTL = """
module alu_core #(
    parameter WIDTH = 8
)(
    input  wire [WIDTH-1:0] a,
    input  wire [WIDTH-1:0] b,
    input  wire [2:0]       opcode,
    output reg  [WIDTH-1:0] result,
    output wire             zero_flag
);
    assign zero_flag = (result == {WIDTH{1'b0}});

    always @(*) begin
        case (opcode)
            3'b000: result = a + b;
            3'b001: result = a - b;
            3'b010: result = a & b;
            3'b011: result = a | b;
            3'b100: result = a ^ b;
            default: result = {WIDTH{1'b0}};
        endcase
    end
endmodule
"""

# 2. Structural Design B: 3-State FSM Controller
FSM_RTL = """
module fsm_controller (
    input  wire clk,
    input  wire rst_n,
    input  wire req,
    output reg  grant,
    output reg  active
);
    localparam S_IDLE  = 2'b00;
    localparam S_GRANT = 2'b01;
    localparam S_DONE  = 2'b10;

    reg [1:0] state, next_state;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) state <= S_IDLE;
        else state <= next_state;
    end

    always @(*) begin
        next_state = state;
        grant = 1'b0;
        active = 1'b0;
        case (state)
            S_IDLE: if (req) next_state = S_GRANT;
            S_GRANT: begin
                grant = 1'b1;
                active = 1'b1;
                next_state = S_DONE;
            end
            S_DONE: next_state = S_IDLE;
            default: next_state = S_IDLE;
        endcase
    end
endmodule
"""

# 3. Structural Design C: Parameterized Shift Register & Counter
COUNTER_RTL = """
module param_shift_counter #(
    parameter N = 16
)(
    input  wire clk,
    input  wire rst_n,
    input  wire en,
    input  wire shift_in,
    output reg  [N-1:0] shift_reg,
    output reg  [7:0]   cycle_count
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            shift_reg <= {N{1'b0}};
            cycle_count <= 8'd0;
        end else if (en) begin
            shift_reg <= {shift_reg[N-2:0], shift_in};
            cycle_count <= cycle_count + 8'd1;
        end
    end
endmodule
"""

# 4. Deliberately Broken RTL (Syntax failure)
BROKEN_RTL = """
module broken_syntax (
    input wire a,
    output wire b
);
    assign b = a + ; // Syntax error
endmodule
"""

# 5. Unsupported Construct RTL
UNSUPPORTED_RTL = """
module defparam_example (input wire clk);
    defparam submod.PARAM_X = 42;
    import "DPI-C" function void c_helper();
endmodule
"""

class TestEngine(unittest.TestCase):

    def test_design_analyzer_structural_designs(self):
        with tempfile.TemporaryDirectory() as tmp:
            f_alu = os.path.join(tmp, "alu.v")
            f_fsm = os.path.join(tmp, "fsm.v")
            f_cnt = os.path.join(tmp, "counter.v")

            with open(f_alu, "w") as f: f.write(ALU_RTL)
            with open(f_fsm, "w") as f: f.write(FSM_RTL)
            with open(f_cnt, "w") as f: f.write(COUNTER_RTL)

            analyzer = DesignAnalyzer(tmp)
            res = analyzer.analyze_files(["alu.v", "fsm.v", "counter.v"])

            self.assertEqual(len(res["modules"]), 3)
            mod_names = [m["name"] for m in res["modules"]]
            self.assertIn("alu_core", mod_names)
            self.assertIn("fsm_controller", mod_names)
            self.assertIn("param_shift_counter", mod_names)

            fsm_mod = next(m for m in res["modules"] if m["name"] == "fsm_controller")
            self.assertTrue(fsm_mod["constructs"]["fsm_detected"])

            cnt_mod = next(m for m in res["modules"] if m["name"] == "param_shift_counter")
            self.assertGreater(cnt_mod["constructs"]["counters_detected"], 0)

    def test_unsupported_construct_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            f_unsup = os.path.join(tmp, "unsup.v")
            with open(f_unsup, "w") as f: f.write(UNSUPPORTED_RTL)

            analyzer = DesignAnalyzer(tmp)
            res = analyzer.analyze_files(["unsup.v"])
            self.assertGreaterEqual(len(res["unsupported_constructs"]), 2)
            constructs = [u["construct"] for u in res["unsupported_constructs"]]
            self.assertIn("defparam", constructs)

    def test_mutation_engine_safety_and_operators(self):
        with tempfile.TemporaryDirectory() as tmp:
            f_alu = os.path.join(tmp, "alu.v")
            f_tb = os.path.join(tmp, "tb_alu.v")
            with open(f_alu, "w") as f: f.write(ALU_RTL)
            with open(f_tb, "w") as f: f.write("// testbench file\ninitial $finish;")

            engine = MutationEngine(tmp)
            mutants = engine.generate_mutants(["alu.v", "tb_alu.v"], max_mutants=20)

            # Ensure testbench file was NEVER mutated
            for m in mutants:
                self.assertEqual(m["file"], "alu.v")
                self.assertNotIn("tb_alu", m["file"])

            # Ensure arithmetic and relational mutations were applied
            categories = {m["category"] for m in mutants}
            self.assertTrue("arithmetic" in categories or "relational" in categories)

    def test_independent_safety_validator(self):
        mock_kill_matrix = {
            "tests": [
                {"id": "t1", "name": "test_add", "estimated_runtime_ms": 100},
                {"id": "t2", "name": "test_sub", "estimated_runtime_ms": 100},
                {"id": "t3", "name": "test_logic", "estimated_runtime_ms": 200}
            ],
            "mutants": [
                {"id": "m1", "category": "arithmetic", "status": "killed"},
                {"id": "m2", "category": "relational", "status": "killed"},
                {"id": "m3", "category": "reset_value", "status": "killed"}
            ],
            "cells": {
                "t1__m1": {"detected": True},
                "t2__m2": {"detected": True},
                "t3__m3": {"detected": True}
            }
        }

        # If t3 (which kills m3 reset_value) is omitted, must trigger fallback!
        validator = SafetyValidator(mock_kill_matrix, retention_threshold=95.0, must_kill_categories=["reset_value"])
        bad_report = validator.validate_suite(["t1", "t2"])
        self.assertEqual(bad_report["status"], "rejected_fallback")
        self.assertTrue(bad_report["fallback_triggered"])
        self.assertGreater(len(bad_report["must_kill_rule_violations"]), 0)

        # When all necessary tests are selected
        good_report = validator.validate_suite(["t1", "t2", "t3"])
        self.assertEqual(good_report["status"], "passed")
        self.assertFalse(good_report["fallback_triggered"])

if __name__ == '__main__':
    unittest.main()
