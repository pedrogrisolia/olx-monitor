import {
  applyExtractionWindowToCron,
  isValidCronExpression,
  shouldRunScraperNow,
} from "../../utils/scraperSchedule";

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

  describe("applyExtractionWindowToCron", () => {
    it("deve manter minutos e demais campos e limitar horas para 5-23", () => {
      expect(applyExtractionWindowToCron("*/45 * * * *")).toBe("*/45 5-23 * * *");
      expect(applyExtractionWindowToCron("0 */2 * * 1-5")).toBe("0 5-23 * * 1-5");
    });

    it("deve retornar expressão original quando cron for inválido", () => {
      expect(applyExtractionWindowToCron("* * * *")).toBe("* * * *");
    });
  });

  describe("isValidCronExpression", () => {
    it("deve validar cron com 5 campos", () => {
      expect(isValidCronExpression("*/45 * * * *")).toBe(true);
    });

    it("deve invalidar cron com quantidade incorreta de campos", () => {
      expect(isValidCronExpression("* * * *")).toBe(false);
      expect(isValidCronExpression("* * * * * *")).toBe(false);
    });
  });
});
