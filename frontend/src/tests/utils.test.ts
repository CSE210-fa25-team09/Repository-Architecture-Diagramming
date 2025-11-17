import { getSystemTheme } from "@/lib/utils"
import { describe, expect, it } from "vitest"

describe("getSystemTheme", () => {
  it("returns light when window is undefined", () => {
    const originalWindow = globalThis.window
    try {
      // @ts-expect-error - simulate SSR environment without window
      globalThis.window = undefined

      expect(getSystemTheme()).toBe("light")
    } finally {
      globalThis.window = originalWindow
    }
  })
})
