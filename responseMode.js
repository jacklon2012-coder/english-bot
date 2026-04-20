/**
 * Determines the bot's response mode based on inputType and user settings.
 * @param {'voice'|'text'} inputType — type of the incoming message
 * @param {object} settings — UserSettings from KV
 * @returns {'voice'|'text'}
 */
export function resolveResponseMode(inputType, settings) {
  if (settings && settings.stickyMode) {
    return settings.voiceMode ? 'voice' : 'text';
  }
  return inputType;
}

/**
 * Checks whether stickyMode should be reset based on inputType matching voiceMode.
 * Returns updated settings object (does NOT save to KV).
 * @param {'voice'|'text'} inputType
 * @param {object} settings
 * @returns {object} settings (possibly with stickyMode=false)
 */
export function checkAndResetSticky(inputType, settings) {
  if (!settings || !settings.stickyMode) {
    return settings;
  }

  const inputMatchesVoiceMode =
    (inputType === 'voice' && settings.voiceMode === true) ||
    (inputType === 'text' && settings.voiceMode === false);

  if (inputMatchesVoiceMode) {
    return { ...settings, stickyMode: false };
  }

  return settings;
}
