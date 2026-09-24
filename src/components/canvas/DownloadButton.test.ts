import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const { exportMock } = vi.hoisted(() => ({ exportMock: vi.fn() }));

vi.mock("../../lib/exportImage", () => ({
  exportElementAsPng: exportMock,
  buildFileName: () => "Sayless-test.png",
}));

import DownloadButton from "./DownloadButton.vue";

describe("DownloadButton", () => {
  beforeEach(() => {
    exportMock.mockReset();
    exportMock.mockResolvedValue(undefined);

    const canvas = document.createElement("div");
    canvas.id = "status-canvas";
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  /**
   * GTM triggers the template_download event off this id. Moving the button
   * into a shared component must not drop it.
   */
  it("keeps the analytics hook id", () => {
    const wrapper = mount(DownloadButton);

    expect(wrapper.get("button").attributes("id")).toBe("download");
  });

  it("exports the status canvas when clicked", async () => {
    const wrapper = mount(DownloadButton);

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(exportMock).toHaveBeenCalledTimes(1));

    expect(exportMock).toHaveBeenCalledWith(
      document.getElementById("status-canvas"),
      expect.any(String),
    );
  });

  it("surfaces a failure to the user instead of failing silently", async () => {
    exportMock.mockRejectedValue(new Error("rasterisation failed"));
    const wrapper = mount(DownloadButton);

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() =>
      expect(wrapper.find('[role="alert"]').exists()).toBe(true),
    );

    expect(wrapper.find('[role="alert"]').text()).not.toBe("");
  });

  it("reports rather than throws when there is no canvas to export", async () => {
    document.body.innerHTML = "";
    const wrapper = mount(DownloadButton);

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() =>
      expect(wrapper.find('[role="alert"]').exists()).toBe(true),
    );

    expect(exportMock).not.toHaveBeenCalled();
  });

  it("ignores repeat clicks while an export is in flight", async () => {
    let release!: () => void;
    exportMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const wrapper = mount(DownloadButton);
    const button = wrapper.get("button");

    await button.trigger("click");
    await button.trigger("click");
    await button.trigger("click");

    expect(exportMock).toHaveBeenCalledTimes(1);

    release();
  });
});
