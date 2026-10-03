import "@testing-library/jest-dom";

// jsdom has no matchMedia; components that adapt to screen size (useIsMobile) need it.
// Tests choose a layout by setting window.innerWidth before rendering.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
