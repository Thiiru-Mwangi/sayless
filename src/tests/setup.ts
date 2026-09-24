/**
 * jsdom does not implement ResizeObserver, which CanvasFrame uses to measure
 * its container. The stub records observers without firing them, so components
 * fall back to their initial scale — which is exactly the deterministic
 * geometry these tests assert on.
 */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;
