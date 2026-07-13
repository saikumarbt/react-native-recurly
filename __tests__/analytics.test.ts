import { priceBucket } from "@/lib/analytics";

describe("priceBucket", () => {
  it("bands monthly amounts without exposing exact values", () => {
    expect(priceBucket(2.99)).toBe("under_5");
    expect(priceBucket(9.99)).toBe("5_15");
    expect(priceBucket(15)).toBe("15_50");
    expect(priceBucket(49.99)).toBe("15_50");
    expect(priceBucket(77.49)).toBe("50_plus");
  });

  it("handles boundaries and invalid input", () => {
    expect(priceBucket(5)).toBe("5_15");
    expect(priceBucket(50)).toBe("50_plus");
    expect(priceBucket(0)).toBe("unknown");
    expect(priceBucket(NaN)).toBe("unknown");
  });
});
