/**
 * Verified JK Flip-Flop Design and Testbench
 * Standard EDA verification benchmark for ModelSim, Vivado, and Icarus Verilog.
 */

export const JK_FF_DESIGN = `// Synthesizable JK Flip-Flop with Active-Low Asynchronous Reset
\`timescale 1ns/1ps

module jk_ff (
  input wire clk,
  input wire rst_n,
  input wire j,
  input wire k,
  output reg q,
  output wire q_bar
);

  assign q_bar = ~q;

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      q <= 1'b0;
    end else begin
      case ({j, k})
        2'b00: q <= q;        // No change (Hold)
        2'b01: q <= 1'b0;     // Reset (Clear)
        2'b10: q <= 1'b1;     // Set
        2'b11: q <= ~q;       // Toggle
      endcase
    end
  end

endmodule
`;

export const JK_FF_TESTBENCH = `// Comprehensive Self-Checking Testbench for JK Flip-Flop
// Compatible with ModelSim (vsim), Vivado (xsim), and Icarus (vvp)
\`timescale 1ns/1ps

module tb_jk_ff;
  reg clk;
  reg rst_n;
  reg j;
  reg k;
  wire q;
  wire q_bar;

  integer error_count = 0;

  // Instantiate DUT
  jk_ff uut (
    .clk(clk),
    .rst_n(rst_n),
    .j(j),
    .k(k),
    .q(q),
    .q_bar(q_bar)
  );

  // Clock generation: 100MHz (10ns period)
  initial begin
    clk = 0;
    forever #5 clk = ~clk;
  end

  initial begin
    $display("[START] Initiating JK Flip-Flop EDA Simulation...");
    rst_n = 0;
    j = 0;
    k = 0;

    // Test 1: Asynchronous Reset Check
    #15;
    if (q !== 1'b0 || q_bar !== 1'b1) begin
      $display("[FAIL] Test 1 Failed: Reset state incorrect. Q=%b, Q_bar=%b", q, q_bar);
      error_count = error_count + 1;
    end else begin
      $display("[PASS] Test 1: Asynchronous Reset verified (Q=0, Q_bar=1)");
    end

    // Release Reset
    rst_n = 1;
    #10;

    // Test 2: Set Operation (J=1, K=0)
    @(negedge clk);
    j = 1; k = 0;
    @(posedge clk);
    #1;
    if (q !== 1'b1) begin
      $display("[FAIL] Test 2 Failed: Set condition failed. Q=%b", q);
      error_count = error_count + 1;
    end else begin
      $display("[PASS] Test 2: Set condition verified (J=1, K=0 -> Q=1)");
    end

    // Test 3: Hold Operation (J=0, K=0)
    @(negedge clk);
    j = 0; k = 0;
    @(posedge clk);
    #1;
    if (q !== 1'b1) begin
      $display("[FAIL] Test 3 Failed: Hold condition failed. Q=%b", q);
      error_count = error_count + 1;
    end else begin
      $display("[PASS] Test 3: Hold condition verified (J=0, K=0 -> Q=1)");
    end

    // Test 4: Reset Operation (J=0, K=1)
    @(negedge clk);
    j = 0; k = 1;
    @(posedge clk);
    #1;
    if (q !== 1'b0) begin
      $display("[FAIL] Test 4 Failed: Clear condition failed. Q=%b", q);
      error_count = error_count + 1;
    end else begin
      $display("[PASS] Test 4: Reset/Clear condition verified (J=0, K=1 -> Q=0)");
    end

    // Test 5: Toggle Operation (J=1, K=1)
    @(negedge clk);
    j = 1; k = 1;
    @(posedge clk);
    #1;
    if (q !== 1'b1) begin
      $display("[FAIL] Test 5a Failed: Toggle 0->1 failed. Q=%b", q);
      error_count = error_count + 1;
    end else begin
      $display("[PASS] Test 5a: Toggle verified 0 -> 1");
    end

    @(posedge clk);
    #1;
    if (q !== 1'b0) begin
      $display("[FAIL] Test 5b Failed: Toggle 1->0 failed. Q=%b", q);
      error_count = error_count + 1;
    end else begin
      $display("[PASS] Test 5b: Toggle verified 1 -> 0");
    end

    #20;
    if (error_count == 0) begin
      $display("[PASS] 100%% of JK Flip-Flop tests passed successfully across all states.");
    end else begin
      $display("[FAIL] Simulation finished with %0d errors.", error_count);
    end
    $finish;
  end

endmodule
`;
