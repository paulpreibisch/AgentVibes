/**
 * Custom Inquirer List Prompt with Spacebar Preview
 * Uses wrapper approach with readline keypress events
 */

import readline from 'node:readline';
import { execSync } from 'node:child_process';

/**
 * Wrapper for inquirer list prompt that adds spacebar preview
 * @param {Object} inquirer - Inquirer instance
 * @param {Object} config - Prompt configuration
 * @param {Function} config.onPreview - Callback for preview (receives selected value)
 * @returns {Promise} Inquirer prompt promise
 */
export async function createPreviewListPrompt(inquirer, config) {
  const { onPreview, ...promptConfig } = config;

  // Set up keypress listener
  let keypressListener = null;

  // Track playing state
  let currentlyPlaying = null;
  let audioProcess = null;

  // Initialize currentSelection to match the default value
  let currentSelection = 0;
  if (promptConfig.default) {
    const defaultIndex = promptConfig.choices.findIndex(c => c.value === promptConfig.default);
    if (defaultIndex !== -1) {
      currentSelection = defaultIndex;
    }
  }

  // Function to stop currently playing audio
  const stopAudio = () => {
    // Kill the specific process if we have it
    // SECURITY: Only kill our own process, never use pkill which affects all users
    if (audioProcess) {
      try {
        audioProcess.kill('SIGKILL');
        audioProcess = null;
      } catch (e) {
        // Process might have already finished or already killed
      }
    }

    currentlyPlaying = null;
  };

  if (onPreview && process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    // SECURITY: Wrap in try-catch to prevent terminal corruption on error
    try {
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
    } catch (e) {
      // Failed to set raw mode, continue without it
    }

    keypressListener = async (str, key) => {
      // Track current selection based on arrow keys
      if (key && key.name === 'down') {
        currentSelection = Math.min(currentSelection + 1, promptConfig.choices.length - 1);
      } else if (key && key.name === 'up') {
        currentSelection = Math.max(currentSelection - 1, 0);
      }

      if (key && key.name === 'space') {
        // Get the current item (don't filter - use actual index)
        const currentChoice = promptConfig.choices[currentSelection];

        // Only preview if it's a valid choice (not separator, not special item)
        if (currentChoice && currentChoice.value && !currentChoice.value.startsWith('__')) {

          // Toggle: if same voice pressed twice, stop it
          if (currentlyPlaying === currentChoice.value) {
            stopAudio();
            return;
          }

          // CRITICAL: Stop previous voice BEFORE starting new one
          if (currentlyPlaying) {
            stopAudio();
            // Small delay to ensure kill takes effect
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          currentlyPlaying = currentChoice.value;

          // Call onPreview and store process handle immediately
          try {
            const result = await onPreview(currentChoice.value);
            // Store the process handle - onPreview should return the spawn() result
            audioProcess = result;
          } catch (err) {
            console.error(`[Preview] Error playing sample:`, err.message);
            currentlyPlaying = null;
            audioProcess = null;
          }
        }
      }
    };

    process.stdin.on('keypress', keypressListener);
  }

  try {
    // Run the standard list prompt
    const result = await inquirer.prompt([{
      ...promptConfig,
      type: 'list'
    }]);

    return result;
  } finally {
    // Stop any playing audio
    stopAudio();

    // Clean up keypress listener
    if (keypressListener) {
      process.stdin.removeListener('keypress', keypressListener);
      // SECURITY: Wrap in try-catch to ensure cleanup always completes
      try {
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(false);
        }
      } catch (e) {
        // Failed to restore raw mode, but we're exiting anyway
      }
      // readline.emitKeypressEvents() put stdin into flowing mode; pause it so the
      // open stdin handle no longer keeps the event loop alive after the prompt
      // resolves (otherwise the process lingers until stdin is otherwise closed).
      try {
        process.stdin.pause();
      } catch (e) {
        // stdin may already be closed; nothing more to do
      }
    }
  }
}

export default createPreviewListPrompt;
