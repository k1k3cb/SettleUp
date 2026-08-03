import { describe, it, expect } from "vitest";
import { formatCents, formatLongDate, formatLongDateTime, formatShortDate, formatShortDateWithYear, formatDateTime, pad2, } from "./formatters";
describe("formatCents", () => {
    it("formatea céntimos a euros con dos decimales", () => {
        expect(formatCents(1234)).toBe("12,34 EUR");
        expect(formatCents(0)).toBe("0,00 EUR");
        expect(formatCents(5)).toBe("0,05 EUR");
        expect(formatCents(50)).toBe("0,50 EUR");
        expect(formatCents(100)).toBe("1,00 EUR");
    });
    it("acepta una moneda distinta a EUR", () => {
        expect(formatCents(1234, "USD")).toBe("12,34 USD");
        expect(formatCents(1234, "GBP")).toBe("12,34 GBP");
    });
    it("usa el signo menos tipográfico para negativos", () => {
        // U+2212, NO el guion ASCII '-'. Esto evita que el carácter se
        // confunda con un separador en cursiva.
        expect(formatCents(-1234)).toBe("−12,34 EUR");
        expect(formatCents(-1)).toBe("−0,01 EUR");
    });
    it("redondea hacia abajo la parte entera y rellena los céntimos", () => {
        // 100000 céntimos = 1000,00 EUR (sin separador de miles, formato cuaderno)
        expect(formatCents(100000)).toBe("1000,00 EUR");
        // 123456 céntimos = 1234,56 EUR
        expect(formatCents(123456)).toBe("1234,56 EUR");
    });
    it("devuelve un em-dash para entradas no finitas", () => {
        expect(formatCents(NaN)).toBe("—");
        expect(formatCents(Infinity)).toBe("—");
        expect(formatCents(-Infinity)).toBe("—");
    });
    it("preserva el signo en el cero si la convención lo requiere", () => {
        // 0 no es negativo: no debe llevar signo.
        expect(formatCents(0)).toBe("0,00 EUR");
    });
});
describe("formatLongDate", () => {
    it("formatea una fecha ISO como fecha larga en español", () => {
        // Forzamos una hora concreta para evitar flakiness por zona horaria.
        expect(formatLongDate("2026-07-27T12:00:00Z")).toBe("27 de julio de 2026");
        expect(formatLongDate("2026-01-01T12:00:00Z")).toBe("1 de enero de 2026");
    });
    it("devuelve cadena vacía si la fecha es inválida", () => {
        expect(formatLongDate("")).toBe("");
        expect(formatLongDate("no-es-una-fecha")).toBe("");
        expect(formatLongDate("2026-13-99T99:99:99Z")).toBe("");
    });
});
describe("formatShortDate", () => {
    it("formatea una fecha ISO como fecha corta en español (con año si no es del actual)", () => {
        // 2030 — fuera del año en curso seguro.
        expect(formatShortDate("2030-07-27T12:00:00Z")).toBe("27 jul 2030");
    });
    it("omite el año cuando la fecha es del año en curso", () => {
        // Tomamos la fecha de hoy como referencia.
        const now = new Date("2026-12-31T12:00:00Z");
        expect(formatShortDate("2026-01-15T12:00:00Z", now)).toMatch(/^15 ene$/);
    });
    it("incluye el año cuando la fecha es de otro año", () => {
        const now = new Date("2026-12-31T12:00:00Z");
        expect(formatShortDate("2025-01-15T12:00:00Z", now)).toBe("15 ene 2025");
    });
    it("devuelve cadena vacía si la fecha es inválida", () => {
        expect(formatShortDate("not-a-date")).toBe("");
    });
});
describe("formatShortDateWithYear", () => {
    it("siempre incluye el año, incluso si la fecha es del año en curso", () => {
        const now = new Date("2026-12-31T12:00:00Z");
        expect(formatShortDateWithYear("2026-01-15T12:00:00Z")).toBe("15 ene 2026");
        // Aunque `now` diga que estamos en 2026, el año va.
        expect(formatShortDateWithYear("2026-01-15T12:00:00Z").includes("2026")).toBe(true);
    });
    it("devuelve cadena vacía si la fecha es inválida", () => {
        expect(formatShortDateWithYear("not-a-date")).toBe("");
    });
});
describe("formatLongDateTime", () => {
    it("formatea fecha larga con hora (la hora puede variar por zona horaria del runner)", () => {
        // Importante: la hora impresa depende de la zona horaria del runner
        // (UTC vs local), porque `new Date(iso)` parsea en local. No
        // asumimos la hora exacta; sólo que la cadena contiene día, mes,
        // año y un patrón HH:MM.
        const out = formatLongDateTime("2026-07-27T14:30:00Z");
        expect(out).toMatch(/27/);
        expect(out).toMatch(/julio/);
        expect(out).toMatch(/2026/);
        expect(out).toMatch(/\d{2}:\d{2}/);
    });
    it("acepta null y devuelve cadena vacía", () => {
        expect(formatLongDateTime(null)).toBe("");
    });
    it("acepta string inválido y devuelve cadena vacía", () => {
        expect(formatLongDateTime("not-a-date")).toBe("");
    });
});
describe("formatDateTime", () => {
    it("formatea fecha + hora en formato corto", () => {
        expect(formatDateTime("2026-07-27T14:30:00Z")).toMatch(/^27 jul,? \d{2}:\d{2}$/);
    });
    it("acepta null y devuelve cadena vacía", () => {
        expect(formatDateTime(null)).toBe("");
    });
    it("acepta string inválido y devuelve cadena vacía", () => {
        expect(formatDateTime("not-a-date")).toBe("");
    });
});
describe("pad2", () => {
    it("rellena con un cero a la izquierda", () => {
        expect(pad2(0)).toBe("00");
        expect(pad2(3)).toBe("03");
        expect(pad2(9)).toBe("09");
    });
    it("no trunca números con más de dos dígitos", () => {
        expect(pad2(10)).toBe("10");
        expect(pad2(99)).toBe("99");
        expect(pad2(100)).toBe("100");
    });
});
