# Agent tooling status

Verified on 2026-11-03. Application scaffolding has not started.

| Tool | Installation | Verification |
| --- | --- | --- |
| Frontend Design | Official `anthropics/skills` source, project `.agents/skills/frontend-design` | Codex `skills/list` reports enabled, repository scope |
| UI/UX Pro Max | Official `ui-ux-pro-max-cli` 2.15.0, project `.agents/skills/ui-ux-pro-max` | Codex reports enabled; bundled search CLI help runs |
| Astryx | Official CLI 0.7.6 installed globally; generated `~/.agents/skills/astryx/SKILL.md` and project `AGENTS.md` block | Codex reports enabled; Astryx doctor reports no warnings or failures |
| Ponytail | Reused existing `~/.codex/skills/ponytail` | Codex reports enabled |
| Impeccable | Reused existing `~/.codex/skills/impeccable` | Codex reports enabled |
| Playwright MCP | Project `.codex/config.toml`, Microsoft `@playwright/mcp` 0.0.84 through npx | MCP initialization and tool listing passed; `browser_navigate` opened `about:blank`; `browser_close` passed |
| Context7 MCP | Project `.codex/config.toml`, Upstash hosted endpoint | MCP initialization and tool listing passed; `resolve-library-id` returned React documentation matches without authentication |

The skill check used Codex's app-server `skills/list` with this project's working directory and a fresh scan. It reported no skill errors. MCP checks used direct JSON-RPC clients; Codex also reads both server configurations as enabled. These checks do not prove that the current chat exposes the servers. Its tool catalog still contains neither server.

## Remaining activation check

Start a new chat in this project and ask it to verify Playwright and Context7 tool availability before scaffolding. If either server is absent, fully quit and reopen Codex, then repeat the check. Confirm native tool discovery and make a harmless call to each server. No API key or authentication was required by the completed Context7 check.

## Scope and preservation

- The original `AGENTS.md` instructions were preserved. Astryx's generated block is separately identified and remains subordinate to the approved specification and Astryx Neutral.
- No application packages, project Playwright test suite, lifecycle hooks, or permission-bypassing modes were added. Playwright uses an isolated, headless browser with sandboxing explicitly enabled.
- UI/UX Pro Max's installer also installed six companion skills. Those unrequested additions were moved out of the project to `/tmp/campus-uipro-unrequested-skills`; only the selected UI/UX skill remains.
- Existing Ponytail and Impeccable installations were not overwritten or duplicated.

## Official setup sources

- [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Astryx global CLI and generated agent guidance](https://astryx.atmeta.com/docs/global)
- [Ponytail](https://github.com/DietrichGebert/ponytail)
- [Impeccable](https://github.com/pbakaus/impeccable)
- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Context7 client configuration](https://context7.com/docs/resources/all-clients)
- [Codex MCP configuration](https://developers.openai.com/codex/mcp)
- [Codex skill discovery](https://developers.openai.com/codex/skills)
