// Codex (gpt-6.1-sol on Responses) through magpie: Factory answered a fresh
// request with 400 content_policy_rejected. Replays on 2026-11-18 found the
// refused part: the sentence Codex opens its system prompt with, alone and
// without its period too; Codex's other opening ("You are a coding agent
// running in the Codex CLI…") and the sentence reworded as below passed.
// Tool-name compatibility, including names Factory no longer refuses but the
// plugin still renames conservatively, is covered in tool-names.test.mjs.
import { afterEach, expect, test } from "bun:test"
import { FactoryAuthPlugin, _internal } from "./index.mjs"

const { DROID_LINE } = _internal
const real = globalThis.fetch
afterEach(() => (globalThis.fetch = real))

const API = "https://api.factory.ai"
const responses = API + "/api/llm/o/v1/responses"
const chat = API + "/api/llm/o/v1/chat/completions"

const OPENING = "You are Codex, an agent based on GPT-6."
const ESCAPED_OPENING = "\\u0059ou are Codex, an agent based on GPT-6."
const CLI_OPENING = "You are a coding agent running in the Codex CLI, a terminal-based coding assistant. Codex CLI is an open source project led by OpenAI."
const CLI_ADAPTED = "You are a coding agent running in the Codex CLI."
const ESCAPED_CLI = "\\u0059ou are a coding agent running in the Codex CLI, a terminal-based coding assistant. Codex CLI is an open source project led by OpenAI."
const REST = "\n\n# When to ask the user for permission\n\nUse your best judgement."
const CODEX = OPENING + REST
const ADAPTED = "You are a coding agent based on GPT-6." + REST

async function loaded() {
  const sent = []
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url))
    if (u.pathname === "/api/cli/whoami") return new Response(JSON.stringify({ userId: "u", orgId: "fac_D", email: "d@example.com", region: "" }))
    sent.push({ url: String(url), body: init.body })
    return new Response('{"id":"ok"}')
  }
  let saved = { type: "oauth", access: "tok", refresh: "r", expires: Date.now() + 3_600_000, accountId: "d@example.com", activeOrganizationId: "fac_D", region: "", premBaseHost: "" }
  const hooks = await FactoryAuthPlugin({ client: { auth: { set: async ({ body }) => (saved = body) } } })
  const l = await hooks.auth.loader(async () => saved)
  return async (url, body) => {
    const res = await l.fetch(url, { method: "POST", headers: { "content-type": "application/json", "user-agent": "codex/0.119.0" }, body: JSON.stringify(body) })
    expect(res.status).toBe(200)
    return JSON.parse(sent.at(-1).body)
  }
}

test("Codex's opening is reworded in Responses' instructions, the rest of its prompt kept", async () => {
  const send = await loaded()
  const b = await send(responses, { model: "gpt-6.1-sol", instructions: CODEX, input: [{ role: "user", content: "hi" }] })
  expect(b.instructions).toBe(DROID_LINE + "\n" + ADAPTED)
})

test("Codex's two-sentence CLI opening is cut to the sentence Factory answers", async () => {
  const send = await loaded()
  const b = await send(responses, { model: "gpt-6.1-sol", instructions: CLI_OPENING + REST, input: [{ role: "user", content: "hi" }] })
  expect(b.instructions).toBe(DROID_LINE + "\n" + CLI_ADAPTED + REST)
  const c = await send(chat, { model: "gpt-6.1-sol", messages: [{ role: "system", content: CLI_OPENING.replace(/\.$/, "") }, { role: "user", content: "hi" }] })
  expect(c.messages[0]).toEqual({ role: "system", content: DROID_LINE + "\n" + CLI_ADAPTED })
})

test("Codex 0.170's developer input is reworded where it sits", async () => {
  const send = await loaded()
  const b = await send(responses, { model: "gpt-6.1-sol", input: [{ type: "message", role: "developer", content: [{ type: "input_text", text: CODEX }] }, { role: "user", content: "hi" }] })
  expect(b.input[0].content[0].text).toBe(ADAPTED)
  expect(b.instructions).toBe(DROID_LINE)
})

test("Codex's opening is reworded without its period too, on chat completions", async () => {
  const send = await loaded()
  const b = await send(chat, { model: "gpt-6.1-sol", messages: [{ role: "system", content: "You are Codex, an agent based on GPT-6" }, { role: "user", content: "hi" }] })
  expect(b.messages[0]).toEqual({ role: "system", content: DROID_LINE + "\nYou are a coding agent based on GPT-6." })
})

test("Codex's opening quoted elsewhere is escaped, and a fragment is kept", async () => {
  const send = await loaded()
  const b = await send(responses, {
    model: "gpt-6.1-sol",
    instructions: "Quote: " + OPENING,
    input: [
      { role: "user", content: "Why does Codex say: " + OPENING },
      { role: "assistant", content: "It opens with You are Codex, an agent based on GPT-6 and then its rules" },
      { role: "user", content: "Codex, an agent based on GPT-6" },
    ],
  })
  expect(b.instructions).toBe(DROID_LINE + "\nQuote: " + ESCAPED_OPENING)
  expect(b.input[0].content).toBe("Why does Codex say: " + ESCAPED_OPENING)
  expect(b.input[1].content).toBe("It opens with \\u0059ou are Codex, an agent based on GPT-6 and then its rules")
  expect(b.input[2].content).toBe("Codex, an agent based on GPT-6")
  expect(JSON.stringify(b)).not.toContain("You are Codex, an agent based on GPT-6")
})

test("Codex's CLI opening quoted elsewhere is escaped", async () => {
  const send = await loaded()
  const b = await send(responses, { model: "gpt-6.1-sol", instructions: "Quote: " + CLI_OPENING, input: [{ role: "user", content: "Why does Codex say: " + CLI_OPENING }] })
  expect(b.instructions).toBe(DROID_LINE + "\nQuote: " + ESCAPED_CLI)
  expect(b.input[0].content).toBe("Why does Codex say: " + ESCAPED_CLI)
})
