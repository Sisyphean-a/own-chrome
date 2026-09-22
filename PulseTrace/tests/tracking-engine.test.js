const { createTrackingEngine } = require("../src/shared/tracking-engine");

const HEARTBEAT_INTERVAL_MS = 10_000;

function buildContext(overrides) {
  return {
    now: 0,
    activeTabId: 1,
    activeUrl: "https://github.com/org/repo",
    activeTitle: "Repo",
    isOsActive: true,
    isBrowserFocused: true,
    isTracked: true,
    ...overrides
  };
}

describe("createTrackingEngine", () => {
  test("accumulates metric1 active duration across context updates", () => {
    const engine = createTrackingEngine({
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS
    });

    engine.applyContext(buildContext({ now: 1_000 }));
    engine.applyContext(buildContext({ now: 6_000 }));
    const result = engine.applyContext(
      buildContext({
        now: 7_000,
        isTracked: false,
        activeUrl: "https://example.com"
      })
    );

    expect(result.completedSession).not.toBeNull();
    expect(result.completedSession.systemActiveDurationMs).toBe(6_000);
    expect(result.completedSession.startTime).toBe(1_000);
    expect(result.completedSession.endTime).toBe(7_000);
  });

  test("starts a new session after the os returns from idle", () => {
    const engine = createTrackingEngine({
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS
    });

    engine.applyContext(buildContext({ now: 0 }));
    const idled = engine.applyContext(buildContext({ now: 5_000, isOsActive: false }));
    const resumed = engine.applyContext(buildContext({ now: 9_000, isOsActive: true }));
    const result = engine.applyContext(
      buildContext({
        now: 12_000,
        isTracked: false,
        activeUrl: "https://example.com"
      })
    );

    expect(idled.completedSession.systemActiveDurationMs).toBe(5_000);
    expect(resumed.state.currentSession.startTime).toBe(9_000);
    expect(result.completedSession.systemActiveDurationMs).toBe(3_000);
  });

  test("aggregates metric2 interaction duration from heartbeat count", () => {
    const engine = createTrackingEngine({
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS
    });

    engine.applyContext(buildContext({ now: 100 }));
    engine.recordHeartbeat({
      now: 1_500,
      tabId: 1,
      url: "https://github.com/org/repo",
      title: "Repo"
    });
    engine.recordHeartbeat({
      now: 5_000,
      tabId: 1,
      url: "https://github.com/org/repo",
      title: "Repo"
    });

    const result = engine.applyContext(
      buildContext({
        now: 10_000,
        isTracked: false,
        activeUrl: "https://example.com"
      })
    );

    expect(result.completedSession.heartbeatCount).toBe(2);
    expect(result.completedSession.pageInteractiveDurationMs).toBe(20_000);
  });

  test("closes the current session when browser focus is lost", () => {
    const engine = createTrackingEngine({
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS
    });

    engine.applyContext(buildContext({ now: 1_000 }));
    const blurred = engine.applyContext(
      buildContext({
        now: 6_000,
        isBrowserFocused: false
      })
    );

    expect(blurred.completedSession).not.toBeNull();
    expect(blurred.completedSession.endTime).toBe(6_000);
    expect(blurred.completedSession.systemActiveDurationMs).toBe(5_000);
    expect(blurred.state.currentSession).toBeNull();
  });

  test("closes the current session when os becomes idle", () => {
    const engine = createTrackingEngine({
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS
    });

    engine.applyContext(buildContext({ now: 2_000 }));
    const idled = engine.applyContext(
      buildContext({
        now: 7_000,
        isOsActive: false
      })
    );

    expect(idled.completedSession).not.toBeNull();
    expect(idled.completedSession.endTime).toBe(7_000);
    expect(idled.completedSession.systemActiveDurationMs).toBe(5_000);
    expect(idled.state.currentSession).toBeNull();
  });
});
