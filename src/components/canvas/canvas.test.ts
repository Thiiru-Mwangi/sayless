import { describe, expect, it, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";

import CanvasFrame from "./CanvasFrame.vue";
import MinimalCanvas from "./MinimalCanvas.vue";
import TwitterCanvas from "./TwitterCanvas.vue";
import PaperCanvas from "./PaperCanvas.vue";
import HighlightCanvas from "./HighlightCanvas.vue";
import PosterCanvas from "./PosterCanvas.vue";
import { SQUARE_FORMAT, STATUS_FORMAT } from "./formats";
import Preview from "../../views/Preview.vue";

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

const CANVASES = [
  ["MinimalCanvas", MinimalCanvas, STATUS_FORMAT],
  ["TwitterCanvas", TwitterCanvas, STATUS_FORMAT],
  ["PaperCanvas", PaperCanvas, STATUS_FORMAT],
  ["HighlightCanvas", HighlightCanvas, SQUARE_FORMAT],
  ["PosterCanvas", PosterCanvas, STATUS_FORMAT],
] as const;

/** CanvasFrame renders host > frame > scaler, with the canvas slotted inside. */
function readGeometry(element: Element) {
  const frame = element.firstElementChild as HTMLElement;
  const scaler = frame.firstElementChild as HTMLElement;
  return { frame, scaler };
}

describe("template canvases", () => {
  it.each(CANVASES)("%s renders a status canvas", (_name, component) => {
    const wrapper = mount(component, { global: { plugins: [pinia] } });

    expect(wrapper.find("#status-canvas").exists()).toBe(true);
  });

  it.each(CANVASES)(
    "%s renders inside a frame at its intrinsic export size",
    (_name, component, format) => {
      const wrapper = mount(CanvasFrame, {
        props: format,
        slots: { default: component },
        global: { plugins: [pinia] },
      });

      const { scaler } = readGeometry(wrapper.element);

      expect(scaler.style.width).toBe(`${format.width}px`);
      expect(scaler.style.height).toBe(`${format.height}px`);
      expect(wrapper.find("#status-canvas").exists()).toBe(true);
    },
  );
});

describe("export formats", () => {
  it("uses WhatsApp status dimensions for 9:16 templates", () => {
    expect(STATUS_FORMAT.width).toBe(1080);
    expect(STATUS_FORMAT.height).toBe(1920);
  });

  it("uses a square canvas for Highlight", () => {
    expect(SQUARE_FORMAT.width).toBe(1080);
    expect(SQUARE_FORMAT.height).toBe(1080);
  });

  it("scales down for display without changing intrinsic size", () => {
    const wrapper = mount(CanvasFrame, {
      props: STATUS_FORMAT,
      slots: { default: MinimalCanvas },
      global: { plugins: [pinia] },
    });

    const { frame, scaler } = readGeometry(wrapper.element);

    // Display box is capped, while the exported node stays full size.
    expect(frame.style.width).toBe(`${STATUS_FORMAT.maxWidth}px`);
    expect(scaler.style.width).toBe(`${STATUS_FORMAT.width}px`);
    expect(scaler.style.transform).toContain("scale(");
  });

  it("keeps the scale transform off the exported canvas root", () => {
    const wrapper = mount(CanvasFrame, {
      props: STATUS_FORMAT,
      slots: { default: MinimalCanvas },
      global: { plugins: [pinia] },
    });

    // html-to-image copies the root's computed style; a transform here would
    // be baked into the export and shrink it.
    const canvas = wrapper.find("#status-canvas").element as HTMLElement;
    expect(canvas.style.transform).toBe("");
  });
});

describe("Preview route", () => {
  async function mountPreview(name: string) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/templates/:name/preview", name: "preview", component: Preview },
      ],
    });

    await router.push(`/templates/${name}/preview`);
    await router.isReady();

    return mount(Preview, { global: { plugins: [router, pinia] } });
  }

  it.each([
    ["minimal", STATUS_FORMAT],
    ["twitter", STATUS_FORMAT],
    ["paper", STATUS_FORMAT],
    ["highlight", SQUARE_FORMAT],
    ["poster", STATUS_FORMAT],
  ])(
    "renders %s at the same intrinsic size as the editor",
    async (name, format) => {
      const wrapper = await mountPreview(name);

      expect(wrapper.find("#status-canvas").exists()).toBe(true);

      const scaler = wrapper.find("#status-canvas").element
        .parentElement as HTMLElement;
      expect(scaler.style.width).toBe(`${format.width}px`);
      expect(scaler.style.height).toBe(`${format.height}px`);
    },
  );

  it("renders nothing for an unknown template rather than throwing", async () => {
    const wrapper = await mountPreview("nope");

    expect(wrapper.find("#status-canvas").exists()).toBe(false);
  });
});
