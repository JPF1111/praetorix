// @ts-check
import os from 'node:os';
import path from 'node:path';

/**
 * Root of the user's Claude Code config. Honors Claude Code's own
 * CLAUDE_CONFIG_DIR override (the current bash/python gate hardcoded
 * ~/.claude and silently broke for anyone using a relocated config).
 */
export function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(os.homedir(), '.claude');
}

/**
 * Praetorix's own persistent data directory: the ledger and audit log.
 * Deliberately outside any plugin's own install directory so a plugin
 * update never touches approval history. Overridable for tests/CI.
 */
export function praetorixHome() {
  return process.env.PRAETORIX_HOME?.trim() || path.join(os.homedir(), '.praetorix');
}

export function ledgerPath() {
  return path.join(praetorixHome(), 'ledger.json');
}

export function auditLogPath() {
  return path.join(praetorixHome(), 'audit.log');
}

export function globalSkillsDir() {
  return path.join(claudeConfigDir(), 'skills');
}

export function installedPluginsManifestPath() {
  return path.join(claudeConfigDir(), 'plugins', 'installed_plugins.json');
}
