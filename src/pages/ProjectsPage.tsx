import React, { useState } from 'react';
import {
  FolderPlus,
  Upload,
  FileCode,
  CheckCircle,
  AlertCircle,
  File,
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
  Lock,
  Cpu,
  HelpCircle
} from 'lucide-react';
import { Project, DesignModel } from '../types';
import { parseUniversalDesign } from '../lib/universalParser';
import { JK_FF_DESIGN, JK_FF_TESTBENCH } from '../data/jkFlipFlop';

interface ProjectsPageProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onCreateProject: (name: string, description: string, files: { name: string; content: string }[]) => void;
  onNavigate: (page: any) => void;
}

// Diverse Reference Designs for Verification Testing & ModelSim/Vivado Benchmarking
const SAMPLE_LIBRARY = [
  {
    id: 'sample-jk-ff',
    name: 'JK Flip-Flop (ModelSim & Vivado Benchmark)',
    category: 'Sequential / Flip-Flops',
    description: 'Synthesizable JK Flip-Flop with active-low asynchronous reset, set, clear, hold, and toggle operations with self-checking testbench.',
    files: [
      {
        name: 'jk_ff.v',
        content: JK_FF_DESIGN
      },
      {
        name: 'tb_jk_ff.v',
        content: JK_FF_TESTBENCH
      }
    ]
  },
  {
    id: 'sample-alu-8bit',
    name: '8-Bit Arithmetic Logic Unit (Combinational)',
    category: 'ALU / Data Path',
    description: 'Purely combinational 8-bit ALU with arithmetic (+/-), bitwise logic (AND/OR/XOR), zero-flag comparator, and self-checking testbench.',
    files: [
      {
        name: 'alu_core.v',
        content: `module alu_core #(
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
endmodule`
      },
      {
        name: 'tb_alu_core.sv',
        content: `\`timescale 1ns/1ps

module tb_alu_core;
    reg [7:0] a;
    reg [7:0] b;
    reg [2:0] opcode;
    wire [7:0] result;
    wire zero_flag;

    alu_core #(.WIDTH(8)) dut (
        .a(a),
        .b(b),
        .opcode(opcode),
        .result(result),
        .zero_flag(zero_flag)
    );

    string testname;
    integer errors = 0;

    initial begin
        a = 0; b = 0; opcode = 0;
        #10;

        if (!$value$plusargs("TESTNAME=%s", testname)) begin
            testname = "all";
        end

        $display("[TB] Running ALU test: %s", testname);

        if (testname == "test_addition" || testname == "all") begin
            a = 8'd25; b = 8'd17; opcode = 3'b000; #10;
            if (result !== 8'd42) begin
                $display("[FAIL] Add: expected 42, got %0d", result);
                errors++;
            end
        end

        if (testname == "test_subtraction" || testname == "all") begin
            a = 8'd50; b = 8'd20; opcode = 3'b001; #10;
            if (result !== 8'd30) begin
                $display("[FAIL] Sub: expected 30, got %0d", result);
                errors++;
            end
        end

        if (testname == "test_logic_and" || testname == "all") begin
            a = 8'hF0; b = 8'h0F; opcode = 3'b010; #10;
            if (result !== 8'h00 || zero_flag !== 1'b1) begin
                $display("[FAIL] AND: expected 0x00 and zero_flag=1");
                errors++;
            end
        end

        if (testname == "test_logic_xor" || testname == "all") begin
            a = 8'hAA; b = 8'h55; opcode = 3'b100; #10;
            if (result !== 8'hFF) begin
                $display("[FAIL] XOR: expected 0xFF, got %h", result);
                errors++;
            end
        end

        #10;
        if (errors == 0) begin
            $display("[PASS] All ALU tests passed.");
            $finish(0);
        end else begin
            $fatal(1);
        end
    end
endmodule`
      }
    ]
  },
  {
    id: 'sample-fsm-arbiter',
    name: '3-State Priority Arbiter FSM',
    category: 'FSM Controller',
    description: 'Sequential FSM with active-low asynchronous reset, request/grant handshake arbitration, and state transition verification.',
    files: [
      {
        name: 'arbiter_fsm.v',
        content: `module arbiter_fsm (
    input  wire clk,
    input  wire rst_n,
    input  wire req_a,
    input  wire req_b,
    output reg  grant_a,
    output reg  grant_b
);
    localparam S_IDLE    = 2'b00;
    localparam S_GRANT_A = 2'b01;
    localparam S_GRANT_B = 2'b10;

    reg [1:0] state, next_state;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) state <= S_IDLE;
        else state <= next_state;
    end

    always @(*) begin
        next_state = state;
        grant_a = 1'b0;
        grant_b = 1'b0;
        case (state)
            S_IDLE: begin
                if (req_a) next_state = S_GRANT_A;
                else if (req_b) next_state = S_GRANT_B;
            end
            S_GRANT_A: begin
                grant_a = 1'b1;
                if (!req_a) next_state = S_IDLE;
            end
            S_GRANT_B: begin
                grant_b = 1'b1;
                if (!req_b) next_state = S_IDLE;
            end
            default: next_state = S_IDLE;
        endcase
    end
endmodule`
      },
      {
        name: 'tb_arbiter_fsm.sv',
        content: `\`timescale 1ns/1ps

module tb_arbiter_fsm;
    reg clk;
    reg rst_n;
    reg req_a;
    reg req_b;
    wire grant_a;
    wire grant_b;

    arbiter_fsm dut (
        .clk(clk),
        .rst_n(rst_n),
        .req_a(req_a),
        .req_b(req_b),
        .grant_a(grant_a),
        .grant_b(grant_b)
    );

    always #5 clk = ~clk;

    string testname;
    integer errors = 0;

    initial begin
        clk = 0; rst_n = 0; req_a = 0; req_b = 0;
        #20 rst_n = 1;

        if (!$value$plusargs("TESTNAME=%s", testname)) begin
            testname = "all";
        end

        if (testname == "test_reset_state" || testname == "all") begin
            #10;
            if (grant_a !== 0 || grant_b !== 0) begin
                $display("[FAIL] Grants asserted after reset");
                errors++;
            end
        end

        if (testname == "test_priority_a" || testname == "all") begin
            @(posedge clk);
            req_a = 1; req_b = 1;
            @(posedge clk);
            #1;
            if (grant_a !== 1 || grant_b !== 0) begin
                $display("[FAIL] Priority arbitration failed for req_a");
                errors++;
            end
            req_a = 0;
            @(posedge clk);
        end

        if (testname == "test_grant_b" || testname == "all") begin
            @(posedge clk);
            req_b = 1;
            @(posedge clk);
            #1;
            if (grant_b !== 1) begin
                $display("[FAIL] Grant B not asserted");
                errors++;
            end
            req_b = 0;
            @(posedge clk);
        end

        #20;
        if (errors == 0) begin
            $display("[PASS] All Arbiter tests passed.");
            $finish(0);
        end else begin
            $fatal(1);
        end
    end
endmodule`
      }
    ]
  },
  {
    id: 'sample-shift-counter',
    name: 'Parameterized Ring Counter & Shift Register',
    category: 'Sequential Register',
    description: 'N-bit configurable parallel-in serial-out shift register with enable gates and synchronous cycle counters.',
    files: [
      {
        name: 'param_shift_reg.v',
        content: `module param_shift_reg #(
    parameter WIDTH = 8
)(
    input  wire             clk,
    input  wire             rst_n,
    input  wire             load,
    input  wire             shift_en,
    input  wire [WIDTH-1:0] data_in,
    input  wire             serial_in,
    output reg  [WIDTH-1:0] shift_out,
    output reg  [7:0]       shift_count
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            shift_out   <= {WIDTH{1'b0}};
            shift_count <= 8'd0;
        end else if (load) begin
            shift_out   <= data_in;
            shift_count <= 8'd0;
        end else if (shift_en) begin
            shift_out   <= {shift_out[WIDTH-2:0], serial_in};
            shift_count <= shift_count + 8'd1;
        end
    end
endmodule`
      },
      {
        name: 'tb_param_shift_reg.sv',
        content: `\`timescale 1ns/1ps

module tb_param_shift_reg;
    reg clk;
    reg rst_n;
    reg load;
    reg shift_en;
    reg [7:0] data_in;
    reg serial_in;
    wire [7:0] shift_out;
    wire [7:0] shift_count;

    param_shift_reg #(.WIDTH(8)) dut (
        .clk(clk),
        .rst_n(rst_n),
        .load(load),
        .shift_en(shift_en),
        .data_in(data_in),
        .serial_in(serial_in),
        .shift_out(shift_out),
        .shift_count(shift_count)
    );

    always #5 clk = ~clk;

    string testname;
    integer errors = 0;

    initial begin
        clk = 0; rst_n = 0; load = 0; shift_en = 0; data_in = 0; serial_in = 0;
        #20 rst_n = 1;

        if (!$value$plusargs("TESTNAME=%s", testname)) begin
            testname = "all";
        end

        if (testname == "test_parallel_load" || testname == "all") begin
            @(posedge clk);
            data_in = 8'hA5; load = 1;
            @(posedge clk);
            load = 0;
            #1;
            if (shift_out !== 8'hA5 || shift_count !== 0) begin
                $display("[FAIL] Parallel load failed");
                errors++;
            end
        end

        if (testname == "test_serial_shift" || testname == "all") begin
            @(posedge clk);
            serial_in = 1; shift_en = 1;
            @(posedge clk);
            #1;
            if (shift_out[0] !== 1 || shift_count !== 1) begin
                $display("[FAIL] Shift operation failed");
                errors++;
            end
            shift_en = 0;
        end

        #20;
        if (errors == 0) begin
            $display("[PASS] Shift register tests passed.");
            $finish(0);
        end else begin
            $fatal(1);
        end
    end
endmodule`
      }
    ]
  }
];

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onNavigate
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // File Upload Handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (fileList: File[]) => {
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadedFiles(prev => [...prev.filter(f => f.name !== file.name), { name: file.name, content }]);
      };
      reader.readAsText(file);
    });
  };

  const handleSubmitCustomProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || uploadedFiles.length === 0) return;
    onCreateProject(projectName, projectDesc, uploadedFiles);
    setShowUploadModal(false);
    setProjectName('');
    setProjectDesc('');
    setUploadedFiles([]);
  };

  const handleLoadSample = (sample: typeof SAMPLE_LIBRARY[0]) => {
    onCreateProject(sample.name, sample.description, sample.files);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Universal RTL Projects & Hardware Upload
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Universal ingestion for ANY synthesizable Verilog/SystemVerilog design without hardcoded architectural assumptions.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/20 transition flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          Upload Custom Hardware RTL
        </button>
      </div>

      {/* Pre-packaged Reference Designs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Design-Agnostic Reference Hardware Suites
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">(Combinational, FSM, sequential & data path architectures)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_LIBRARY.map(sample => (
            <div
              key={sample.id}
              className="bg-[#0b1222] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {sample.category}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Pre-Verified
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition">
                  {sample.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">{sample.files.length} RTL Files</span>
                <button
                  onClick={() => handleLoadSample(sample)}
                  className="px-3 py-1.5 bg-slate-800 group-hover:bg-cyan-600 text-slate-200 group-hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>Load Design</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Directory Table */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Active Hardware Workspaces
            </h3>
            <p className="text-xs text-slate-400">Each workspace maintains strict isolation of sources, snapshots, and experiments.</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{projects.length} Workspaces</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070b14] text-slate-400 border-b border-slate-800 text-[11px] uppercase font-sans">
              <tr>
                <th className="py-3 px-4">Design Workspace</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Discovered Modules</th>
                <th className="py-3 px-4">Testbench Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projects.map(p => {
                const isSelected = activeProject?.id === p.id;
                const tbStatus = p.design?.testbenchInfo.status || 'missing';

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/40 transition cursor-pointer ${
                      isSelected ? 'bg-cyan-950/20' : ''
                    }`}
                    onClick={() => onSelectProject(p)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Cpu className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <div>
                          <div className={`font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans truncate max-w-xs">
                            {p.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        {p.isSample ? 'Reference' : 'Custom Upload'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {p.design?.modules.length || 1} module(s)
                    </td>
                    <td className="py-3 px-4">
                      {tbStatus === 'detected' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                          TESTBENCH READY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                          TESTBENCH MISSING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isSelected ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('design');
                            }}
                            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold font-sans transition flex items-center gap-1"
                          >
                            <span>Open AST</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(p);
                            }}
                            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold font-sans transition"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Custom Design Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1222] border border-cyan-500/40 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#0e172a] border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-cyan-400" />
                Ingest Hardware Design Files
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmitCustomProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Design Workspace Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RISC-V Instruction Decoder / SPI Controller / Custom IP"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Design Notes / Architecture Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Clocking requirements, bus standards, or custom test goals..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Drag and Drop Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Files (.v, .sv, .vh, .svh, .py)
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    isDragging ? 'border-cyan-400 bg-cyan-950/20' : 'border-slate-800 hover:border-slate-700 bg-[#070b14]'
                  }`}
                  onClick={() => document.getElementById('universal-file-upload')?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">
                    Click to select files or drag & drop here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Multi-file Verilog (.v), SystemVerilog (.sv), headers (.vh/.svh), or cocotb (.py)
                  </p>
                  <input
                    id="universal-file-upload"
                    type="file"
                    multiple
                    accept=".v,.sv,.vh,.svh,.py,.mak"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Uploaded File List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Staged Source Files ({uploadedFiles.length}):
                  </div>
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-[#070b14] border border-slate-800 px-3 py-1.5 rounded text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 text-slate-300">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{file.name}</span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          ({file.content.length} bytes)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projectName.trim() || uploadedFiles.length === 0}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                >
                  Parse & Initialize Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
