import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toBlobMock } = vi.hoisted(() => ({ toBlobMock: vi.fn() }));

vi.mock("html-to-image", () => ({ toBlob: toBlobMock }));

import { buildFileName, exportElementAsPng } from "./exportImage";

/** A deferred promise, so ordering can be asserted rather than guessed at. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Lets any already-queued microtasks drain. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountTarget(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  return root;
}

function appendImage(root: HTMLElement): HTMLImageElement {
  const image = document.createElement("img");
  root.appendChild(image);
  return image;
}

describe("exportElementAsPng", () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  /**
   * The missing-uploaded-image regression guard.
   *
   * html-to-image leaves data-URL images untouched and awaits only the outer
   * SVG image, so nested bitmaps could still be undecoded at rasterisation
   * time. If the decode gate is removed, toBlob runs early and this fails.
   */
  it("does not rasterise until every nested image has decoded", async () => {
    const root = mountTarget();
    const firstImage = appendImage(root);
    const secondImage = appendImage(root);

    const first = deferred();
    const second = deferred();
    firstImage.decode = vi.fn(() => first.promise);
    secondImage.decode = vi.fn(() => second.promise);

    const pending = exportElementAsPng(root, "Sayless.png");
    await flush();

    expect(firstImage.decode).toHaveBeenCalled();
    expect(secondImage.decode).toHaveBeenCalled();
    expect(toBlobMock).not.toHaveBeenCalled();

    first.resolve();
    second.resolve();
    await pending;

    expect(toBlobMock).toHaveBeenCalledTimes(1);
  });

  it("does not rasterise until fonts are ready", async () => {
    const root = mountTarget();
    const fonts = deferred();

    Object.defineProperty(document, "fonts", {
      value: { ready: fonts.promise },
      configurable: true,
    });

    const pending = exportElementAsPng(root, "Sayless.png");
    await flush();

    expect(toBlobMock).not.toHaveBeenCalled();

    fonts.resolve();
    await pending;

    expect(toBlobMock).toHaveBeenCalledTimes(1);
  });

  it("captures one output pixel per CSS pixel", async () => {
    const root = mountTarget();

    await exportElementAsPng(root, "Sayless.png");

    expect(toBlobMock).toHaveBeenCalledWith(
      root,
      expect.objectContaining({ pixelRatio: 1 }),
    );
  });

  it("survives an image that fails to decode", async () => {
    const root = mountTarget();
    const image = appendImage(root);
    image.decode = vi.fn(() => Promise.reject(new Error("broken")));

    await expect(
      exportElementAsPng(root, "Sayless.png"),
    ).resolves.toBeUndefined();
    expect(toBlobMock).toHaveBeenCalledTimes(1);
  });

  it("reports failure instead of resolving silently", async () => {
    const root = mountTarget();
    toBlobMock.mockResolvedValue(null);

    await expect(exportElementAsPng(root, "Sayless.png")).rejects.toThrow();
  });

  it("downloads through an object URL rather than a data URL", async () => {
    const root = mountTarget();

    await exportElementAsPng(root, "Sayless.png");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});

describe("buildFileName", () => {
  it("produces a filesystem-safe name", () => {
    const name = buildFileName();

    expect(name).toMatch(/^Sayless-[\dA-Za-z-]+\.png$/);
    expect(name).not.toContain(":");
  });
});
