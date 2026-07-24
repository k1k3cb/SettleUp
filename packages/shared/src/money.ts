export type Cents = number;

export function assertCents(amount: number): Cents {
  if (!Number.isInteger(amount)) {
    throw new Error("Money amounts must be stored as integer cents.");
  }

  return amount;
}

export function formatCents(amount: Cents, locale = "es-ES", currency = "EUR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(amount / 100);
}
