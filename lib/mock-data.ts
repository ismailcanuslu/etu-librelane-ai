export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "uart_controller",
    path: "~/projects/uart_controller",
    createdAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "proj-2",
    name: "alu_design",
    path: "~/projects/alu_design",
    createdAt: "2026-03-15T11:30:00Z",
  },
  {
    id: "proj-3",
    name: "spi_master",
    path: "~/projects/spi_master",
    createdAt: "2026-03-20T08:45:00Z",
  },
];

export const MOCK_HISTORIES: Record<string, Message[]> = {
  "proj-1": [
    {
      id: "m1",
      role: "user",
      content: "UART kontrolcüsü için Verilog kodu yazabilir misin? 9600 baud rate, 8N1 konfigürasyonu.",
      timestamp: "2026-03-10T09:10:00Z",
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "Tabii! 9600 baud rate ve 8N1 konfigürasyonu için UART TX/RX modülünü hazırladım.\n\n```verilog\nmodule uart_tx (\n  input  clk,\n  input  rst_n,\n  input  [7:0] data_in,\n  input  tx_start,\n  output reg tx,\n  output reg tx_busy\n);\n  // 9600 baud @ 50MHz: 50_000_000/9600 = 5208\n  localparam BAUD_DIV = 5208;\n  ...\nendmodule\n```\n\nSentez için `librelane run --design uart_controller` komutunu kullanabilirsin. Başka bir modül eklememi ister misin?",
      timestamp: "2026-03-10T09:11:00Z",
    },
    {
      id: "m3",
      role: "user",
      content: "Harika! Simülasyon için testbench de ekler misin?",
      timestamp: "2026-03-10T09:15:00Z",
    },
    {
      id: "m4",
      role: "assistant",
      content:
        "Testbench modülünü ekliyorum:\n\n```verilog\n`timescale 1ns/1ps\nmodule uart_tb;\n  reg clk, rst_n;\n  reg [7:0] data_in;\n  reg tx_start;\n  wire tx, tx_busy;\n\n  uart_tx uut(.clk(clk), .rst_n(rst_n),\n    .data_in(data_in), .tx_start(tx_start),\n    .tx(tx), .tx_busy(tx_busy));\n\n  initial clk = 0;\n  always #10 clk = ~clk;\n\n  initial begin\n    rst_n = 0; #50;\n    rst_n = 1;\n    data_in = 8'hA5;\n    tx_start = 1; #20;\n    tx_start = 0;\n    #100000 $finish;\n  end\n\n  initial $dumpfile(\"uart_tb.vcd\");\n  initial $dumpvars;\nendmodule\n```\n\nGTKWave ile görüntülemek için: `gtkwave uart_tb.vcd`",
      timestamp: "2026-03-10T09:16:00Z",
    },
  ],
  "proj-2": [
    {
      id: "m5",
      role: "user",
      content: "ALU tasarımı için 16-bit arithmetic logic unit istiyorum. ADD, SUB, AND, OR, XOR, NOT işlemlerini desteklesin.",
      timestamp: "2026-03-15T11:35:00Z",
    },
    {
      id: "m6",
      role: "assistant",
      content:
        "16-bit ALU modülünü hazırladım. 4-bit opcode ile 16 farklı işlem desteklenebilir:\n\n```verilog\nmodule alu_16bit (\n  input  [15:0] a, b,\n  input  [3:0]  opcode,\n  output reg [15:0] result,\n  output reg zero, carry, overflow\n);\n  localparam ADD=4'h0, SUB=4'h1, AND=4'h2,\n             OR=4'h3,  XOR=4'h4, NOT=4'h5;\n\n  always @(*) begin\n    case(opcode)\n      ADD: {carry, result} = a + b;\n      SUB: {carry, result} = a - b;\n      AND: result = a & b;\n      OR:  result = a | b;\n      XOR: result = a ^ b;\n      NOT: result = ~a;\n      default: result = 16'h0;\n    endcase\n    zero = (result == 16'h0);\n  end\nendmodule\n```\n\nOpenLane ile sentezlemek için `config.json` dosyasını nasıl yapılandırmamı istersin?",
      timestamp: "2026-03-15T11:36:00Z",
    },
  ],
  "proj-3": [
    {
      id: "m7",
      role: "user",
      content: "SPI master modülü lazım. Mode 0, 8-bit transfer.",
      timestamp: "2026-03-20T08:50:00Z",
    },
    {
      id: "m8",
      role: "assistant",
      content:
        "SPI Master modülü (Mode 0: CPOL=0, CPHA=0):\n\n```verilog\nmodule spi_master (\n  input        clk, rst_n,\n  input        start,\n  input  [7:0] mosi_data,\n  output reg   sclk, cs_n, mosi,\n  output reg [7:0] miso_data,\n  output reg   done\n);\n  // Implementasyon devam ediyor...\nendmodule\n```\n\nLibreLane konfigürasyonu hazırlandı. `make synthesis` ile başlayabilirsin.",
      timestamp: "2026-03-20T08:51:00Z",
    },
  ],
};
