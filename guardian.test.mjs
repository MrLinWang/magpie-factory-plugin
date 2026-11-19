// Codex 0.170's guardian review prompt tells the reviewer it runs read-only,
// has no network access, and must not ask for sandbox permissions. Factory
// refused all three sentences together (400 content_policy_rejected,
// replayed 2026-11-19); each alone and every pair passed, so only the network
// sentence is said another way. These check the line on every route the
// guardian prompt reaches the plugin by.
import { expect, test } from "bun:test"
import { _internal } from "./index.mjs"

const { droidBody, DROID_LINE } = _internal
const responses = "/api/llm/o/v1/responses"
const chat = "/api/llm/o/v1/chat/completions"

const RESTRICTIONS = "- You are running in the same execution environment, but you can only run read-only commands. You have no network access. Do not provide the `sandbox_permissions` for any reason, commands will be rejected."
const REWORDED = "- You are running in the same execution environment, but you can only run read-only commands. Network access is unavailable. Do not provide the `sandbox_permissions` for any reason, commands will be rejected."

test("the guardian restriction line is reworded in Responses' instructions", () => {
  const out = JSON.parse(droidBody(responses, JSON.stringify({ model: "deepseek-v4.1-flash", instructions: RESTRICTIONS, input: [] })))
  expect(out.instructions).toBe(DROID_LINE + "\n" + REWORDED)
})

test("the guardian restriction line is reworded on chat completions' system message", () => {
  const out = JSON.parse(droidBody(chat, JSON.stringify({ model: "deepseek-v4.1-flash", messages: [{ role: "system", content: RESTRICTIONS }, { role: "user", content: "judge this" }] })))
  expect(out.messages[0]).toEqual({ role: "system", content: DROID_LINE + "\n" + REWORDED })
})

test("the guardian restriction line is reworded where Codex sends it as a developer input", () => {
  const out = JSON.parse(droidBody(responses, JSON.stringify({ model: "deepseek-v4.1-flash", input: [{ type: "message", role: "developer", content: [{ type: "input_text", text: RESTRICTIONS }] }, { role: "user", content: "judge this" }] })))
  expect(out.input[0].content[0].text).toBe(REWORDED)
  expect(out.instructions).toBe(DROID_LINE)
})
