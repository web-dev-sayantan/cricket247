import { describe, expect, it, mock } from "bun:test";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";

const setTheme = mock((theme: string) => theme);
const themeState: { theme: string } = {
  theme: "system",
};

mock.module("next-themes", () => ({
  useTheme: () => ({
    setTheme,
    theme: themeState.theme,
  }),
}));

const modeToggleModulePromise = import("./mode-toggle");

describe("ModeToggle", () => {
  it("sets light theme when clicking the light button", async () => {
    const { ModeToggle } = await modeToggleModulePromise;

    setTheme.mockClear();
    themeState.theme = "system";
    const { getByTitle } = renderWithProviders(<ModeToggle />);

    fireEvent.click(getByTitle("Light"));

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("sets dark theme when clicking the dark button", async () => {
    const { ModeToggle } = await modeToggleModulePromise;

    setTheme.mockClear();
    themeState.theme = "light";
    const { getByTitle } = renderWithProviders(<ModeToggle />);

    fireEvent.click(getByTitle("Dark"));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("sets system theme when clicking the system button", async () => {
    const { ModeToggle } = await modeToggleModulePromise;

    setTheme.mockClear();
    themeState.theme = "dark";
    const { getByTitle } = renderWithProviders(<ModeToggle />);

    fireEvent.click(getByTitle("System"));

    expect(setTheme).toHaveBeenCalledWith("system");
  });
});
