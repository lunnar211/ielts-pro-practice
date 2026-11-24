// Browser text-to-speech helpers.
//
// Chrome returns an empty voice list from speechSynthesis.getVoices() until
// the voices have finished loading (the `voiceschanged` event). And in a
// browser with no speech voices installed at all (headless Chrome, some
// Linux installs), speechSynthesis.speak() silently does nothing: no
// onstart, no onend, no onerror ever fires. Callers must check for voices
// first and tell the user plainly, instead of leaving them staring at a
// button that appears to do nothing.

export const NO_VOICE_MESSAGE =
  "No voice available in this browser, so the audio cannot play. Try Chrome or Edge on a computer.";

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Voices currently available, waiting briefly for Chrome to load them.
 * Returns an empty array when the browser has no speech voices at all.
 */
export function waitForVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!hasSpeechSynthesis()) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const loaded = synth.getVoices();
    if (loaded.length > 0) {
      resolve(loaded);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, timeoutMs);
  });
}
