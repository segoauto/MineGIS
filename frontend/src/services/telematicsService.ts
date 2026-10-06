/**
 * Telematics Service
 * Completely static telematics engine with NO timers, NO random calculations,
 * and NO simulated coordinate changes.
 */

// Aggressively clear any lingering background timers in the browser environment
if (typeof window !== 'undefined') {
  for (let i = 1; i < 10000; i++) {
    window.clearInterval(i)
  }
}

class TelematicsEngine {
  public start() {
    // Disabled: Vehicle coordinates must remain steady at authentic locations.
  }

  public stop() {
    // Disabled
  }
}

export const telematicsEngine = new TelematicsEngine()
