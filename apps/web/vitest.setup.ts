import "@testing-library/jest-dom/vitest";

// Mock scrollIntoView for Radix UI components (not available in JSDOM)
Element.prototype.scrollIntoView = () => {};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
