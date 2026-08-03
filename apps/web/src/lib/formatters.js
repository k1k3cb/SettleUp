/**
 * Formatters monetarios y de fecha compartidos por la app.
 *
 * Centralizamos estas funciones porque estaban duplicadas en
 * `ExpenseForm`, `ExpenseDetailsSheet` y `GroupDetailPage`. Una sola
 * implementación, una sola batería de tests, una sola fuente de verdad.
 *
 * Todas las funciones son **puras**: no leen estado, no hacen I/O,
 * no dependen del locale del sistema. El locale se fija a `es-ES`
 * explícitamente para que los snapshots de los tests sean estables
 * en cualquier máquina.
 */
const LOCALE = "es-ES";
/**
 * Formatea un importe en céntimos como string con la moneda al final.
 *
 *   formatCents(1234)              → "12,34 EUR"
 *   formatCents(1234, "EUR")      → "12,34 EUR"
 *   formatCents(0)                 → "0,00 EUR"
 *   formatCents(-1234)            → "−12,34 EUR"
 *   formatCents(NaN)               → "—"
 *
 * El símbolo `−` (U+2212) es el signo menos tipográfico, no el
 * guion ASCII. Distingue "negativo" de "separador" en cursiva.
 *
 * Para monedas no-EUR, se imprime el código ISO tal cual
 * (`"12,34 USD"`). No convertimos símbolos porque el backend solo
 * soporta EUR por ahora; si se añaden, este helper será el sitio
 * donde meter el mapa de símbolos.
 */
export function formatCents(cents, currency = "EUR") {
    if (!Number.isFinite(cents))
        return "—";
    const sign = cents < 0 ? "−" : "";
    const abs = Math.abs(cents);
    const major = Math.floor(abs / 100);
    const minor = (abs % 100).toString().padStart(2, "0");
    return `${sign}${major},${minor} ${currency}`;
}
/**
 * Formatea una fecha ISO 8601 como fecha larga en español.
 *
 *   formatLongDate("2026-07-27T14:30:00Z") → "27 de julio de 2026"
 *   formatLongDate("2026-01-01T12:00:00Z") → "1 de enero de 2026"
 *
 * Usa `day: "numeric"` (no `"2-digit"`) porque `Intl` con `"2-digit"`
 * rellena días 1-9 con cero a la izquierda ("01 de enero"), que no
 * es el estilo que queremos en el cuaderno.
 *
 * Devuelve `""` si la fecha no se puede parsear, para que el llamador
 * pueda ocultarla sin hacer `if`.
 */
export function formatLongDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return d.toLocaleDateString(LOCALE, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
/**
 * Formatea una fecha ISO 8601 como fecha corta en español.
 *
 *   formatShortDate("2026-07-27T00:00:00Z") → "27 jul 2026"
 *   formatShortDate("2027-01-15T00:00:00Z") → "15 ene 2027"
 *
 * Si la fecha es del año en curso, omite el año:
 *   formatShortDate("2026-12-31T00:00:00Z") (en 2026) → "31 dic"
 *
 * Esa omisión es la que usaba `GroupDetailPage` y se siente más
 * natural en una lista: si todo lo de la lista es de "este año",
 * el año es ruido.
 */
export function formatShortDate(iso, now = new Date()) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString(LOCALE, {
        day: "2-digit",
        month: "short",
        year: sameYear ? undefined : "numeric",
    });
}
/**
 * Variante de `formatShortDate` que **siempre** incluye el año.
 * Útil cuando la lista contiene fechas de varios años y no puedes
 * confiar en la regla del "año en curso" (la lista de cuentas es
 * un caso típico: puede haber grupos abiertos en 2025 y en 2026).
 */
export function formatShortDateWithYear(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return d.toLocaleDateString(LOCALE, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
/**
 * Formatea una fecha ISO 8601 con día + hora en formato corto.
 *
 *   formatDateTime("2026-07-27T14:30:00Z") → "27 jul, 14:30"
 */
export function formatDateTime(iso) {
    if (!iso)
        return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return d.toLocaleString(LOCALE, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
/**
 * Formatea una fecha ISO 8601 como fecha larga con hora al final.
 * Usado en la cabecera del detalle de un gasto, donde importa más
 * la fecha que la compacidad.
 *
 *   formatLongDateTime("2026-07-27T14:30:00Z") → "27 de julio de 2026, 14:30"
 */
export function formatLongDateTime(iso) {
    if (!iso)
        return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return d.toLocaleString(LOCALE, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
/**
 * Rellena un número con ceros a la izquierda hasta `width` dígitos.
 *
 *   pad2(3)   → "03"
 *   pad2(33)  → "33"
 *   pad2(123) → "123" (no se trunca)
 */
export function pad2(n) {
    return n.toString().padStart(2, "0");
}
