/**
 * AgentVibes TUI — Shared Widget: Picker Chrome Helpers
 *
 * Pure, blessed-free string builders shared by every selector modal so the
 * control hints and titles look identical across the whole app. Keeping these
 * free of any blessed import makes them trivially unit-testable (no
 * AGENTVIBES_TEST_MODE gate needed).
 *
 *   renderHelpBar([{ key, label }, ...]) -> a tag-formatted hint row
 *   selectorTitle('Voice')               -> a standardized box label
 *
 * Color grammar (Paul's spec): square brackets grey, key word magenta,
 * the '=' grey, the action label white.
 */

const C_BRACKET = '#9e9e9e'; // grey  — the [ ] around the key
const C_KEY = 'magenta';     //        — the key word (Space, Enter, Esc…)
const C_EQ = '#9e9e9e';      // grey  — the '=' sign
const C_LABEL = 'white';     //        — the action label (preview, select…)

/**
 * Build one standardized help-bar row from a list of {key, label} hints.
 * Only pass hints whose keys actually do something in this picker — the bar
 * must never advertise a control that does not fire.
 *
 * @param {Array<{key: string, label: string}>} items
 * @param {object} [opts]
 * @param {string} [opts.sep='  ']  separator between hints
 * @returns {string} blessed tag-formatted string (host must set tags:true)
 */
export function renderHelpBar(items, opts = {}) {
  const sep = opts.sep ?? '  ';
  if (!Array.isArray(items)) return '';
  return items
    .filter((it) => it && it.key && it.label)
    .map(({ key, label }) =>
      `{${C_BRACKET}-fg}[{/${C_BRACKET}-fg}`
      + `{${C_KEY}-fg}${key}{/${C_KEY}-fg}`
      + `{${C_BRACKET}-fg}]{/${C_BRACKET}-fg} `
      + `{${C_EQ}-fg}={/${C_EQ}-fg} `
      + `{${C_LABEL}-fg}${label}{/${C_LABEL}-fg}`)
    .join(sep);
}

/**
 * Standardized box label for a selector modal:
 *   ' {bold}{cyan-fg}<name> Selector{/cyan-fg}{/bold} '
 * Pass the noun only — e.g. selectorTitle('Voice') -> ' Voice Selector '.
 *
 * @param {string} name
 * @returns {string}
 */
export function selectorTitle(name) {
  return ` {bold}{cyan-fg}${name} Selector{/cyan-fg}{/bold} `;
}
