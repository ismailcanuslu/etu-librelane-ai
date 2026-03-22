export interface FileNode {
  name: string;
  type: "file" | "dir";
  children?: FileNode[];
  ext?: string;
}

export const MOCK_FILE_TREE: Record<string, FileNode[]> = {
  "proj-1": [
    {
      name: "src",
      type: "dir",
      children: [
        { name: "uart_tx.v", type: "file", ext: "v" },
        { name: "uart_rx.v", type: "file", ext: "v" },
        { name: "uart_top.v", type: "file", ext: "v" },
      ],
    },
    {
      name: "tb",
      type: "dir",
      children: [
        { name: "uart_tb.v", type: "file", ext: "v" },
        { name: "uart_tb.vcd", type: "file", ext: "vcd" },
      ],
    },
    {
      name: "runs",
      type: "dir",
      children: [
        {
          name: "RUN_2026.03.10_09.00.00",
          type: "dir",
          children: [
            { name: "logs", type: "dir", children: [
              { name: "synthesis.log", type: "file", ext: "log" },
              { name: "floorplan.log", type: "file", ext: "log" },
            ]},
            { name: "results", type: "dir", children: [
              { name: "uart_controller.gds", type: "file", ext: "gds" },
              { name: "uart_controller.lef", type: "file", ext: "lef" },
            ]},
          ],
        },
      ],
    },
    { name: "config.json", type: "file", ext: "json" },
    { name: "Makefile", type: "file", ext: "" },
    { name: "README.md", type: "file", ext: "md" },
  ],
  "proj-2": [
    {
      name: "rtl",
      type: "dir",
      children: [
        { name: "alu_16bit.v", type: "file", ext: "v" },
        { name: "adder.v", type: "file", ext: "v" },
        { name: "multiplier.v", type: "file", ext: "v" },
      ],
    },
    {
      name: "tb",
      type: "dir",
      children: [{ name: "alu_tb.v", type: "file", ext: "v" }],
    },
    { name: "config.json", type: "file", ext: "json" },
    { name: "README.md", type: "file", ext: "md" },
  ],
  "proj-3": [
    {
      name: "hdl",
      type: "dir",
      children: [
        { name: "spi_master.v", type: "file", ext: "v" },
        { name: "spi_slave.v", type: "file", ext: "v" },
      ],
    },
    { name: "config.json", type: "file", ext: "json" },
    { name: "Makefile", type: "file", ext: "" },
  ],
};

// Mock analysis output logs
export const MOCK_LOG_OUTPUT: Record<string, string> = {
  "proj-1": `[INFO]  Starting synthesis flow for uart_controller
[INFO]  Loading design from uart_top.v
[WARNING] Latch inferred in module uart_rx at line 47 - use explicit reset
[INFO]  Running Yosys synthesis...
[INFO]  Technology mapping complete
[WARNING] Timing path not met: uart_tx/baud_gen -> uart_tx/tx_reg (slack: -0.23 ns)
[ERROR]  DRC violation: metal spacing rule in cell ROW_3 COL_12
[INFO]  Floorplanning complete: utilization 67.3%
[WARNING] High fanout net: clk_div has 234 loads, consider buffering
[INFO]  Placement complete
[ERROR]  LVS mismatch: expected 1247 devices, found 1249 in extracted netlist
[INFO]  Routing complete with 3 DRC errors
[WARNING] Power analysis: static power 2.3mW exceeds target 2.0mW
[INFO]  Generating GDSII...
[INFO]  Flow completed with 2 errors and 4 warnings`,
  "proj-2": `[INFO]  Starting synthesis for alu_design
[INFO]  Loading RTL sources...
[INFO]  Running formal verification
[WARNING] Undriven signal: alu_16bit/overflow at line 23
[INFO]  Synthesis complete
[ERROR]  Timing constraint violated: setup time margin -1.1ns on path ALU_OUT[15]
[INFO]  Placement and routing started
[WARNING] Congestion hotspot detected in region (120, 340) - (180, 400)
[INFO]  GDSII export complete`,
  "proj-3": `[INFO]  Initializing SPI master synthesis
[INFO]  Loading configuration from config.json
[INFO]  RTL elaboration complete
[WARNING] Clock domain crossing detected: sclk -> sys_clk, no synchronizer found
[INFO]  Synthesis complete
[INFO]  No DRC errors found
[INFO]  Flow completed successfully`,
};
