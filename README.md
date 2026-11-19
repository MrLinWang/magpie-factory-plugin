# @magpie-community/opencode-factory-auth

Use a [Factory](https://factory.ai) (Droid) subscription from magpie,
OpenCode, Claude Code, or another coding agent.

The plugin signs in with WorkOS's device flow under droid's own client, keeps
the sign-in fresh, and sends each model request to the API and wire format
droid uses. Provider id: `factory`.

Requests from other agents are adapted only where Factory refuses fixed
Droid or Claude client metadata. Task instructions, conversation history,
tool definitions, images, and file contents are preserved.

## Install

### magpie

```sh
magpie plugin add @magpie-community/opencode-factory-auth
magpie plugin login factory
```

### OpenCode

Add the package to `plugin` in `opencode.json`, then run:

```sh
opencode auth login
```

Choose Factory and complete the sign-in. The provider id is `factory` for
both OpenCode 1.x and 2.x.

## Sign-in

- **Sign in with Factory (device code).** WorkOS's device flow under droid's
  own client. The browser opens Factory's page with the code filled in;
  confirm it there and the plugin picks up the tokens.
- **Factory API key.** A key (`fk-…`), as droid takes one from
  `FACTORY_API_KEY`. It is sent as the bearer token with droid's headers and
  never renewed. A key carries no organization header; `whoami`, asked once
  with the key, says whose it is and where its organization is served.
- **Organization.** A token that isn't in an organization yet is put in the
  first one your account belongs to.
- **Whoami.** The plugin asks `whoami` for your active organization, its
  region (EU organizations go to `api.eu.factory.ai`) and any host of the
  organization's own. Every request then carries them, as droid's do.

If Factory refuses the organization a request names, the plugin asks
`whoami` again and resends the request once. If the refusal stands, the
error says what to check.

## Credentials and refresh

The sign-in is kept wherever the host keeps provider sign-ins:

- OpenCode: `~/.local/share/opencode/auth.json`
- magpie: `plugin-auth.json`

A device-code sign-in stores WorkOS's access and refresh tokens together with
the organization, region, and host.

- magpie renews the access token three minutes before it lapses, through the
  plugin's `auth.refresh`, before its requests and usage need it, and saves
  the new tokens. OpenCode doesn't call that hook: there the token is
  renewed two minutes before it lapses, before a request, and the plugin
  saves it.
- WorkOS rotates the refresh token. The plugin never runs two refreshes at
  once and never spends one refresh token twice; a request that arrives
  before magpie has saved a renewal goes on with the new tokens.
- An account is signed out only when WorkOS refuses the refresh token (a
  4xx other than 429). Any other failure keeps the sign-in, and the current
  token is used while it lasts.

## Models

Each model is served on the one API droid uses for it:

| API | Models |
|---|---|
| Anthropic Messages (`/api/llm/a`) | Fable 5.2, Fable 5.1, Fable 5, Opus 5.5, Opus 5, Opus 4.8 (each also in Fast Mode), Sonnet 5.5, Sonnet 5, Sonnet 4.6, Haiku 5.5, Haiku 4.5, MiniMax M2.7 |
| OpenAI Responses (`/api/llm/o/v1`) | GPT-6.1 Sol, GPT-6 Sol/Astra/Luna, GPT-5.6 Sol/Terra/Luna, GPT-5.5, GPT-5.4, GPT-5.3-Codex (GPT-6 Sol/Luna, GPT-5.6 Sol, GPT-5.5, GPT-5.4, and GPT-5.3-Codex also in Fast Mode), Grok 4.7, Grok 4.6 |
| Chat completions (`/api/llm/o/v1`) | GLM-5.3, GLM-5.3-Flash, GLM-5.2, GLM-5.2 Fast, Kimi K3.1 Pro, Kimi K3, DeepSeek V4.1 Flash, DeepSeek V4.1 Flash 1017, Qwen3.8 Max, MiniMax M3.1 Flash, MiniMax M3, Mistral Large 4, Mistral Medium 3.5, Nemotron 3.5 Super, Nemotron 3 Ultra, Inkling, Muse Spark 1.2, Beam 1.0 |
| Gemini generate (`/api/llm/g/v1/generate`) | Gemini 4 Argon, Gemini 3.1 Pro, Gemini 3.8/3.7/3.6/3.5 Flash, Gemini 3 Flash |

The catalog follows droid's registry: model ids, context and output limits,
image support, reasoning efforts, and token multipliers. droid 1.7.0 models
are included where droid lists them for an account with no special access.
Fable 5.2 asks for the same data-retention terms as Fable 5.1 in droid. It
sits after the other non-Fast models in the default order, so magpie's first
24 stay as they were. Muse Spark 1.2 is on Fireworks but in droid's standard
pool, so Droid Core's windows don't count it.

DeepSeek V4.1 Flash 1017 (`deepseek-v4.1-flash-1017`) is a separate entry,
with droid 0.251.0's 1,040,000-token context, 131,072-token output, image
support, `none`/`low`/`high`/`max` efforts, and 0.12× token multiplier. Like
every other model here it goes to its registry's default upstream,
`apiProviders[0]`, which is Fireworks, as droid sends it with
`x-provider-routing-source: registry_default`. Factory gates 1017 with a
feature flag, so availability still depends on the account.

Not included: `auto` (droid picks it on the client side); GPT-6.1 Terra and
Muse Spark Open (feature-flagged); GPT-6.1 Sol Ultra Fast (high-cost terms);
Muse Spark 1.3 (Responses on Google, which the plugin doesn't send); and
Opus 4.6/4.7 Fast and GPT-5.4 Mini Fast (their base models aren't offered).

### Reasoning efforts

Reasoning efforts are the variants droid offers for each model. DeepSeek
V4.1 Flash (1017 too), Kimi K3, and GLM-5.2 (GLM-5.2 Fast too) accept `none`,
droid's "off", and stop thinking. Reasoning is mandatory on GLM-5.3 and
GLM-5.3-Flash (Fireworks turns `none` away), so `low` is their least.

### Fast Mode

A Fast Mode model (`claude-opus-5-5-fast`, `gpt-5.5-fast`, …) is its base
model served faster, for more of the plan's credits. It goes out as droid
sends it: its own id, with `speed: "fast"` and the
`fast-mode-2026-02-01` beta on Anthropic's API, at
`service_tier: "priority"` on OpenAI's.

A request that asks the base model for fast (Claude Code's `speed: "fast"`,
a Responses request's `service_tier: "priority"`) is sent to its Fast Mode
model, as droid's own fast toggle does. Asked of the base model, Factory
serves the request at standard speed. GLM-5.2 Fast is a model of its own on
chat completions, at droid's 524,288-token context, and isn't sent for fast
asked of GLM-5.2.

### Rates and promotions

A model's price is its token multiplier in droid's registry
(`cost.tokenMultiplier`), which magpie shows beside the model as its rate
(`0.8×`). A running promotion comes off it, with the original multiplier
struck through beside the price (`rateWas`): Mistral Large 4's launch
discount, Gemini 4 Argon's, Gemini 3.8/3.7 Flash's, and GPT-5.6 Sol's (its
Fast Mode too), each while droid's own dates for it hold. Once a promotion
ends, no discount applies.

### Group models by company (option)

In magpie's Factory plugin options, enable **Group models by company** to
list Anthropic's Fable, Opus, Sonnet, and Haiku families together, followed
by OpenAI, Google, and the other model makers. Versions within each family
sort newest first; Fast Mode follows its base model. This groups by model
maker, not by the API hosting company.

The option is off by default, preserving the existing order and the default
first 24 models; enabling it also changes which models occupy those slots.
Refresh the model list after changing it. Names with the same version sort
in descending natural name order, for example GPT-5.6 Terra before Sol and
GLM-5.3-Flash before GLM-5.3.

## Usage and routing

magpie reads `GET /api/billing/limits` and reports:

- **Standard** 5-hour, 7-day, and 30-day windows.
- **Droid Core** windows for the open models.
- **Extra usage** balance.

By default, Standard counts paid-vendor models and Droid Core counts open
models; when Extra usage is available its windows are shown but don't block
routing.

### Standard usage only (optional)

In magpie, open the Factory provider, turn on **Standard usage only** under
**Plugin options**, and save (or set
`"pluginOptions": {"factory": {"standard_only": true}}` in magpie's
`settings.json`). It is off by default, applies to every Factory account,
and takes effect at each account's next usage reading.

When on, the plugin reports the Standard windows as counting every model,
Droid Core's open models too, whether or not the account has Extra usage.
Droid Core's windows and Extra usage are still shown but never keep an
account in routing.

magpie leaves an account out before sending only when it is held at a usage
cap, so pair the option with a cap on each account:

```sh
magpie provider account-cap factory <account> 99
```

An account is then skipped once any Standard window reaches the cap; the
request goes to the next account with the same model, and when every
account is held magpie answers 429 without sending. Without a cap, an
account whose Standard usage is gone is still tried, and Factory may serve a
Droid Core model from Core or Extra usage. Readings lag, so the last
requests before a window fills still go out; to never spend Extra usage,
turn it off in Factory.

## Request compatibility

### Droid identity

Factory serves a subscription's model requests to Droid. droid opens every
system prompt with:

```text
You are Droid, an AI software engineering agent built by Factory.
```

Every OpenAI-shaped request (`/api/llm/o`: GPT and Grok on Responses, the
open models on chat completions) opens with that line too, the agent's own
prompt after it. Known fixed openings from pi, omp, and Codex are rephrased
to the equivalent sentence Factory accepts; the rest of the prompt is left
untouched. Gemini requests go to Factory's generate route with the model in
the body and droid's line opening the system instruction.

### Requests too large (413)

Factory refuses a request body over its size limit with 413 "Request Entity
Too Large". The limit is on bytes, not on the model's context, and images
reach it first.

On a 413 the plugin retries once with every image and file but the newest
replaced by a line saying it was left out, each tool result kept beside its
call, as droid does. If that is still too large, it retries once more with
every image and file left out. If that is still too large, or there was
nothing to leave out, the error names Factory's byte limit: compact the
conversation or start a new one.

### Claude Code through magpie

Factory's Anthropic route requires Droid's fixed client preamble and refuses
some of Claude Code's fixed environment, model, and built-in skill metadata.
The plugin adapts that metadata while preserving coding instructions,
environment values, tool definitions, images, and reasoning options. Ordinary
Droid requests remain unchanged, and OpenAI routes keep their existing
request adapter.

Use magpie's Claude Code integration to select the Factory provider; magpie
manages the provider-specific client settings, including capability and
permission configuration. Fields such as `safeguards` are forwarded for
Factory to validate.

The adapter handles the generated metadata Claude Code sends in its several
shapes, including:

- system identity, environment, model, and runtime-context blocks;
- the built-in `update-config` skill's self-reference in generated skill
  lists (only the known "not Claude" phrase changes);
- compaction summaries, restored Read calls, omitted files, invoked skills,
  changed-on-disk snippets, and the global-instructions reminder;
- string-content `system` messages, token-prefixed bundles, `/compact` turns,
  model-only updates after `/model`, and `# Environment update` blocks;
- startup hooks (`SessionStart`, `SubagentStart`) and deferred-tool
  announcements, whose output is preserved while the metadata after it is
  adapted.

Only complete, recognizable generated text is changed. User messages,
pasted fragments, hook-owned text, fenced code, and incomplete reminders are
left alone.

Fixed client phrases quoted in tool results — for example, reading this
plugin's source, a historical session JSONL record, or another agent's system
prompt — are represented as JSON strings with explicit decoding instructions
and Unicode escapes. Decoding recovers the exact original output, including
quotes, backslashes, and Unicode; the plugin does not delete the output or
replace its identities. The same lossless encoding applies to restored or
`@`-attached Read file text after the generated header, and to changed-file
snippets, while paths and instructions stay verbatim.

Two Anthropic fields are adjusted for Factory's routes: `defer_loading` is
removed from tool declarations (Factory refuses it and it has no model
semantics), and `context_management` is dropped from streaming requests
(Factory's streaming route refuses it while its non-streaming route accepts
it; Claude Code's own compaction still runs). The same adaptation applies to
`/messages` and `/messages/count_tokens`, so token counting sees the prompt
used for inference.

When Factory still answers 403, the error keeps Factory's request id (from
`x-request-id`, `request-id`, or `cf-ray`, or the body) and its error code
and type, and the Anthropic-route body carries `request_id`, so the refusal
can be named to Factory.

Verified with Sonnet 4.6, Sonnet 5.5, and Opus 5.5. Two-turn Read tool calls
with Claude Code's default tool set have been verified with Sonnet 4.6 and
Sonnet 5.5, including Sonnet 5.5 selected through a routing group. Serving
the counting endpoint still depends on the host and upstream. Model and
feature availability depend on the Factory account, organization region, and
upstream API.

### Tool schema compatibility

Factory's Anthropic route rejects tool schemas with root-level `anyOf`,
`oneOf`, or `allOf`. The plugin nests those schemas under an internal
`arguments` property instead of removing their branch constraints, then
unwraps tool replies before returning them to OpenCode or magpie. Examples
and previous tool inputs are wrapped too.

Local schema pointers are rebased to the nested schema; `$id` resources and
anchors retain their resolution scope, and literal data is unchanged.
Recursive schema resources without `$id` fail explicitly because nesting
would change their scope. Affected streaming tool arguments are buffered
until their content block is complete; other events, tool ids, usage, and
upstream errors pass through. An incomplete or invalid argument envelope
fails instead of being executed. Ordinary object schemas and OpenAI routes
keep their existing behavior.

## Troubleshooting

- **403 `content_policy_rejected`** — Factory refused text the plugin doesn't
  recognize. The plugin adapts known fixed client phrases but cannot guess
  new ones or rewrite arbitrary prompts. The error includes Factory's request
  id and error code for reporting.
- **403 for an organization** — the plugin asks `whoami` again and retries
  once. If it still fails, check that the account can access the named
  organization.
- **413** — Factory's byte limit, not the model's context window. Compact the
  conversation or start a new one.
- **Signed out** — re-run `magpie plugin login factory` or
  `opencode auth login`.
- **A model is refused** — some models are behind Factory feature flags
  (Gemini 4 Argon, DeepSeek V4.1 Flash 1017) or depend on the account's plan,
  organization region, and upstream.

## Development

The package has no runtime dependencies; it uses Node's built-in `fetch`,
`Headers`, `Response`, `Buffer`, and `node:http`.

| File | Purpose |
|---|---|
| `index.mjs` | Main implementation: auth, model catalog, request pipeline, usage |
| `opencode.mjs` | OpenCode 1.x / magpie entry; re-exports `FactoryAuthPlugin` |
| `opencode2.mjs` | OpenCode 2.x adapter: default `{ id, setup(ctx) }` |
| `anthropic-tools.mjs` | Tool-name aliases and Anthropic schema wrapping |
| `client-phrases.json` | Single source for refused phrases and tool names |
| `testdata/` | Captured droid registries used as contract fixtures |
| [`docs/factory-plugin-design.md`](docs/factory-plugin-design.md) | Internals, request pipeline, and design tradeoffs (source repository, Chinese) |

Run the tests with [Bun](https://bun.sh):

```sh
bun test
```

The fixtures under `testdata/` pin the model catalog and client behavior to
specific droid releases. Update them together with `index.mjs` when moving to
a new droid version.

## License

MIT
