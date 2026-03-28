import { shouldRunScraperNow } from "../../utils/scraperSchedule";

describe("scraperSchedule", () => {
  describe("shouldRunScraperNow", () => {
    it("deve retornar false entre 00:00 e 04:59", () => {
      expect(shouldRunScraperNow(new Date("2026-03-28T00:00:00"))).toBe(false);
      expect(shouldRunScraperNow(new Date("2026-03-28T04:59:59"))).toBe(false);
    });

    it("deve retornar true a partir de 05:00", () => {
      expect(shouldRunScraperNow(new Date("2026-03-28T05:00:00"))).toBe(true);
    });

    it("deve retornar true no fim do dia", () => {
      expect(shouldRunScraperNow(new Date("2026-03-28T23:59:59"))).toBe(true);
    });
  });
});
