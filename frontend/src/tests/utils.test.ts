import { formatLastGenerated, getSystemTheme, repoTreeToAscii } from "@/lib/utils"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

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

describe("formatLastGenerated", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns 'Just now' when timestamp is missing or very recent", () => {
    expect(formatLastGenerated(undefined)).toBe("Just now")

    const thirtySecondsAgo = (Date.now() - 30_000) / 1000
    expect(formatLastGenerated(thirtySecondsAgo)).toBe("Just now")
  })

  it("formats minutes and hours correctly", () => {
    const ninetySecondsAgo = (Date.now() - 90_000) / 1000
    expect(formatLastGenerated(ninetySecondsAgo)).toBe("1 minute ago")

    const twoHoursAgo = (Date.now() - 2 * 60 * 60 * 1000) / 1000
    expect(formatLastGenerated(twoHoursAgo)).toBe("2 hours ago")
  })

  it("falls back to full timestamp for older entries", () => {
    const formatted = "Mocked Date"
    vi.spyOn(Date.prototype, "toLocaleString").mockReturnValue(formatted)

    const twoDaysAgo = (Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000
    expect(formatLastGenerated(twoDaysAgo)).toBe(`Generated at ${formatted}`)
  })
})

describe("repoTreeToAscii", () => {
  it("renders nested directories with a root label", () => {
    const ascii = repoTreeToAscii(
      [
        {
          name: "src",
          type: "dir",
          path: "src",
          children: [
            { name: "index.ts", type: "file", path: "src/index.ts" },
            {
              name: "components",
              type: "dir",
              path: "src/components",
              children: [
                { name: "Button.tsx", type: "file", path: "src/components/Button.tsx" },
              ],
            },
          ],
        },
        { name: "README.md", type: "file", path: "README.md" },
      ],
      "my-repo",
    )

    expect(ascii).toBe(
      [
        "my-repo",
        "|-- src/",
        "|   |-- index.ts",
        "|   |-- components/",
        "|   |   |-- Button.tsx",
        "|-- README.md",
      ].join("\n"),
    )
  })
})
