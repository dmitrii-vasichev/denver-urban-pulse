import {
  formatNumber,
  formatDelta,
  formatDate,
  formatDateShort,
  formatAqi,
} from "../lib/format";

describe("formatNumber", () => {
  it("formats with commas", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("handles small numbers", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(42)).toBe("42");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-500)).toBe("-500");
  });

  it("returns dash for null/undefined", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });
});

describe("formatDelta", () => {
  it("formats positive with +", () => {
    expect(formatDelta(12.3)).toBe("+12.3%");
  });

  it("formats negative with minus sign", () => {
    expect(formatDelta(-5.1)).toBe("\u22125.1%");
  });

  it("handles zero", () => {
    expect(formatDelta(0)).toBe("0.0%");
  });

  it("returns dash for null/undefined", () => {
    expect(formatDelta(null)).toBe("—");
    expect(formatDelta(undefined)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats date string", () => {
    expect(formatDate("2026-03-13")).toBe("Mar 13, 2026");
  });

  it("formats Date object", () => {
    expect(formatDate(new Date("2026-01-01"))).toBe("Jan 1, 2026");
  });

  it("returns dash for null/undefined/invalid", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateShort", () => {
  it("formats without year", () => {
    expect(formatDateShort("2026-03-13")).toBe("Mar 13");
  });

  it("returns dash for null/undefined/invalid", () => {
    expect(formatDateShort(null)).toBe("—");
    expect(formatDateShort(undefined)).toBe("—");
    expect(formatDateShort("bad")).toBe("—");
  });
});

describe("formatAqi", () => {
  it("returns Good for 0-50", () => {
    const result = formatAqi(42);
    expect(result).toEqual({ value: 42, label: "Good", level: "Good" });
  });

  it("returns Moderate for 51-100", () => {
    const result = formatAqi(75);
    expect(result).toEqual({
      value: 75,
      label: "Moderate",
      level: "Moderate",
    });
  });

  it("returns Unhealthy for Sensitive Groups for 101-150", () => {
    const result = formatAqi(120);
    expect(result).toEqual({
      value: 120,
      label: "Unhealthy for Sensitive Groups",
      level: "Unhealthy for Sensitive Groups",
    });
  });

  it("returns Unhealthy for 151-200", () => {
    expect(formatAqi(180)?.level).toBe("Unhealthy");
  });

  it("returns Very Unhealthy for 201-300", () => {
    expect(formatAqi(250)?.level).toBe("Very Unhealthy");
  });

  it("returns Hazardous for 301-500", () => {
    expect(formatAqi(400)?.level).toBe("Hazardous");
  });

  it("clamps to 0 for negative values", () => {
    const result = formatAqi(-5);
    expect(result).toEqual({ value: 0, label: "Good", level: "Good" });
  });

  it("handles boundary values", () => {
    expect(formatAqi(50)?.level).toBe("Good");
    expect(formatAqi(51)?.level).toBe("Moderate");
    expect(formatAqi(100)?.level).toBe("Moderate");
    expect(formatAqi(101)?.level).toBe("Unhealthy for Sensitive Groups");
  });

  it("returns null for null/undefined", () => {
    expect(formatAqi(null)).toBeNull();
    expect(formatAqi(undefined)).toBeNull();
  });
});
