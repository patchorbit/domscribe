# @domscribe/overlay

Lit web components for Domscribe's in-app overlay UI. Uses shadow DOM for CSS/JS isolation.

`@domscribe/overlay` renders the element picker, annotation panel, and draggable tab inside the running app. It connects to the relay via WebSocket and queries the runtime for live component context. Because it uses shadow DOM, it does not interfere with the host application's styles or JavaScript.

## Install

```bash
npm install @domscribe/overlay
```

This package is usually installed automatically by a framework adapter (`@domscribe/next`, `@domscribe/nuxt`) rather than added directly.

## Configuration

```ts
interface OverlayOptions {
  initialMode?: 'collapsed' | 'expanded' | 'capturing';
  debug?: boolean;
  sidebarWidth?: number;
}
```

| Option         | Type          | Default       | Description                                                                                                              |
| -------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `initialMode`  | `OverlayMode` | `'collapsed'` | Initial display mode. `collapsed` shows just the tab, `expanded` shows the sidebar, `capturing` activates element picker |
| `debug`        | `boolean`     | `false`       | Enable debug logging                                                                                                     |
| `sidebarWidth` | `number`      | `360`         | Sidebar width in pixels                                                                                                  |

## Display Modes

- **collapsed** — Only the draggable tab is visible on the right edge of the viewport
- **expanded** — The sidebar panel is open, showing annotations and element details
- **capturing** — The element picker is active; clicking any element selects it and captures its runtime context

## Tab Persistence

The collapsed tab's vertical position is stored in `localStorage` as `domscribe:tabOffsetY` (0-100%, default `50` = center). The tab is draggable along the right edge with a 4px drag threshold to distinguish a click from a drag.

## Shadow DOM

The overlay renders inside a shadow root to prevent CSS and JavaScript conflicts with the host application. This means:

- Host application styles do not bleed into the overlay
- Overlay styles do not bleed into the host application
- Playwright locators and `.click()` calls do not pierce shadow DOM — use `page.evaluate()` for automated testing of the overlay itself

## Links

Part of [Domscribe](https://github.com/patchorbit/domscribe).

## License

MIT
