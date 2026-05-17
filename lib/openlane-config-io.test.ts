/**
 * Config I/O round-trip tests. Run: npx tsx lib/openlane-config-io.test.ts
 */
import {
  configToEntries,
  entriesToConfig,
  parseConfigContent,
  serializeConfigContent,
} from "./openlane-config-io";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const sample = {
  DESIGN_NAME: "top",
  VERILOG_FILES: "dir::src",
  CLOCK_PERIOD: 10,
  FILL_INSERTION: 1,
};

function testJsonRoundTrip() {
  const ser = serializeConfigContent(sample, "json");
  const parsed = parseConfigContent(ser, "json");
  assert(parsed.ok, "json parse failed");
  const back = entriesToConfig(configToEntries(parsed.data));
  assert(back.DESIGN_NAME === "top", "DESIGN_NAME mismatch");
  assert(back.FILL_INSERTION === 1, "FILL_INSERTION mismatch");
}

function testYamlRoundTrip() {
  const ser = serializeConfigContent(sample, "yaml");
  const parsed = parseConfigContent(ser, "yaml");
  assert(parsed.ok, `yaml parse failed: ${!parsed.ok && parsed.error}`);
  const back = entriesToConfig(configToEntries(parsed.data));
  assert(back.DESIGN_NAME === "top", "yaml DESIGN_NAME mismatch");
}

function testYmlRoundTrip() {
  const ser = serializeConfigContent({ CLOCK_PORT: "clk" }, "yml");
  const parsed = parseConfigContent(ser, "yml");
  assert(parsed.ok, "yml parse failed");
  assert(parsed.data.CLOCK_PORT === "clk", "yml CLOCK_PORT mismatch");
}

testJsonRoundTrip();
testYamlRoundTrip();
testYmlRoundTrip();
console.log("openlane-config-io: all tests passed");
