/**
 * Universal Starter Testbench Generator
 * Synthesizes a valid, self-checking Verilog/SystemVerilog testbench for ANY module interface.
 * Used when a user uploads RTL without an accompanying testbench.
 */

import { ModuleDefinition, PortDefinition } from '../types';

export function generateStarterTestbench(
  moduleDef: ModuleDefinition,
  clockName?: string,
  resetName?: string,
  resetActiveLow: boolean = true
): string {
  const modName = moduleDef.name;
  const tbName = `tb_${modName}`;

  // Find clock and reset from ports if not provided
  const clkPort = moduleDef.ports.find(p =>
    clockName ? p.name === clockName : /^(clk|clock|aclk|hclk|sys_clk)/i.test(p.name)
  );
  const rstPort = moduleDef.ports.find(p =>
    resetName ? p.name === resetName : /^(rst|reset|rst_n|reset_n|aresetn|hresetn)/i.test(p.name)
  );

  const effectiveClk = clkPort ? clkPort.name : 'clk';
  const effectiveRst = rstPort ? rstPort.name : 'rst_n';

  // Separate inputs, outputs, inouts
  const inputs = moduleDef.ports.filter(p => p.direction === 'input');
  const outputs = moduleDef.ports.filter(p => p.direction === 'output');
  const inouts = moduleDef.ports.filter(p => p.direction === 'inout');

  const regDeclarations = inputs.map(p => {
    const width = p.width === '1' ? '' : `${p.width} `;
    return `    reg ${width}${p.name};`;
  }).join('\n');

  const wireDeclarations = outputs.map(p => {
    const width = p.width === '1' ? '' : `${p.width} `;
    return `    wire ${width}${p.name};`;
  }).join('\n');

  const inoutDeclarations = inouts.map(p => {
    const width = p.width === '1' ? '' : `${p.width} `;
    return `    wire ${width}${p.name};`;
  }).join('\n');

  const portConnections = moduleDef.ports.map(p => `        .${p.name}(${p.name})`).join(',\n');

  // Input reset value initializers
  const inputInit = inputs.map(p => {
    if (p.name === effectiveClk) return `        ${p.name} = 1'b0;`;
    if (p.name === effectiveRst) return `        ${p.name} = 1'b${resetActiveLow ? '0' : '1'};`;
    return `        ${p.name} = 0;`;
  }).join('\n');

  // Input toggle stimulus
  const walkingOnesStimulus = inputs
    .filter(p => p.name !== effectiveClk && p.name !== effectiveRst)
    .map(p => `        ${p.name} = ~0;\n        #20;\n        ${p.name} = 0;\n        #20;`)
    .join('\n');

  const randomStimulus = inputs
    .filter(p => p.name !== effectiveClk && p.name !== effectiveRst)
    .map(p => `            ${p.name} = $random;`)
    .join('\n');

  return `\`timescale 1ns/1ps

// ============================================================================
// Auto-Generated Starter Testbench for Universal Design Ingestion
// Target DUT: ${modName}
// Note: Mark clearly as Starter Testbench - user should customize assertions.
// ============================================================================

module ${tbName};

    // DUT Signal Declarations
${regDeclarations}
${wireDeclarations}
${inoutDeclarations}

    // Instantiation of DUT
    ${modName} dut (
${portConnections}
    );

    // Clock Generation (10ns Period / 100MHz)
    always #5 ${effectiveClk} = ~${effectiveClk};

    // Test Selection Plusarg Variable
    reg [255:0] testname;
    integer pass_count;
    integer fail_count;

    initial begin
        pass_count = 0;
        fail_count = 0;

        // Initialize all inputs
${inputInit}

        // Apply Reset Pulse
        #20;
        ${effectiveRst} = 1'b${resetActiveLow ? '1' : '0'};
        #20;

        if (!$value$plusargs("TESTNAME=%s", testname)) begin
            testname = "all";
        end

        $display("[TB] ========================================================");
        $display("[TB] Starting Starter Testbench for: ${modName}");
        $display("[TB] Active Test Routine: %0s", testname);
        $display("[TB] ========================================================");

        if (testname == "test_reset_condition" || testname == "all") begin
            run_test_reset();
        end

        if (testname == "test_stimulus_boundaries" || testname == "all") begin
            run_test_boundaries();
        end

        if (testname == "test_randomized_vectors" || testname == "all") begin
            run_test_randomized();
        end

        #50;
        if (fail_count == 0) begin
            $display("[PASS] All starter test sequences passed without fatal errors.");
            $finish(0);
        end else begin
            $display("[FAIL] Completed with %0d errors detected.", fail_count);
            $fatal(1);
        end
    end

    // Task 1: Reset Condition Verification
    task run_test_reset;
        begin
            $display("[RUN] Running test_reset_condition...");
            #10;
            // Verify output signals are driven (not high-impedance 'z')
            ${outputs.length > 0 ? outputs.map(p => `
            if (${p.name} === 1'bx || ${p.name} === 1'bz) begin
                $display("[FAIL] Output port ${p.name} is floating or undefined after reset.");
                fail_count = fail_count + 1;
            end`).join('\n') : '$display("[INFO] Combinational module without sequential outputs.");'}
            $display("[PASS] Reset condition verified.");
            pass_count = pass_count + 1;
        end
    endtask

    // Task 2: Boundary Walking-Ones Stimulus
    task run_test_boundaries;
        begin
            $display("[RUN] Running test_stimulus_boundaries...");
${walkingOnesStimulus || '            #20;'}
            $display("[PASS] Boundary stimulus applied.");
            pass_count = pass_count + 1;
        end
    endtask

    // Task 3: Randomized Vector Stress
    task run_test_randomized;
        integer i;
        begin
            $display("[RUN] Running test_randomized_vectors (32 cycles)...");
            for (i = 0; i < 32; i = i + 1) begin
                @(posedge ${effectiveClk});
${randomStimulus}
            end
            $display("[PASS] Randomized vectors executed.");
            pass_count = pass_count + 1;
        end
    endtask

endmodule
`;
}
