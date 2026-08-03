// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseDetailsSheet } from "./ExpenseDetailsSheet";
import type { ExpenseWithSplits } from "@/services/expenses";
import type { GroupMember } from "@/services/members";

const ME = "u-me";
const OTHER = "u-other";

const members: GroupMember[] = [
  { userId: ME, name: "Yo", joinedAt: "2026-07-01T00:00:00Z" },
  { userId: OTHER, name: "Marta", joinedAt: "2026-07-02T00:00:00Z" },
];

const baseExpense: ExpenseWithSplits = {
  id: "e-1",
  groupId: "g-1",
  description: "Cena del viernes",
  amountCents: 1200,
  currency: "EUR",
  paidBy: ME,
  splitMethod: "equal",
  isCancelled: false,
  createdAt: "2026-07-27T20:30:00Z",
  splits: [
    { id: "s-1", expenseId: "e-1", userId: ME, owedAmountCents: 600 },
    { id: "s-2", expenseId: "e-1", userId: OTHER, owedAmountCents: 600 },
  ],
};

function makeWrapper(
  expense: ExpenseWithSplits | null = baseExpense,
  initialOpen: boolean = true,
) {
  const onOpenChange = vi.fn();
  function Wrapper() {
    return (
      <ExpenseDetailsSheet
        expense={expense}
        members={members}
        payerName="Yo"
        open={initialOpen}
        onOpenChange={onOpenChange}
      />
    );
  }
  return { Wrapper, onOpenChange };
}

describe("<ExpenseDetailsSheet />", () => {
  it("muestra la descripción, el importe y el pagador del gasto", async () => {
    const { Wrapper } = makeWrapper();
    render(<Wrapper />);

    // La descripción aparece en el header.
    expect(
      screen.getByRole("heading", { name: "Cena del viernes" }),
    ).toBeInTheDocument();

    // El importe formateado aparece en el resumen y en la lista Σ.
    // getAllByText confirma que está en ambos lugares.
    const imports = screen.getAllByText("12,00 EUR");
    expect(imports.length).toBeGreaterThanOrEqual(2);

    // La fecha en mono: "27 de julio de 2026 a las HH:MM" (la hora
    // exacta depende del timezone del runner, así que no la fijo).
    expect(screen.getByText(/27 de julio de 2026 a las \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("muestra el desglose por miembro en el reparto a partes iguales", async () => {
    const { Wrapper } = makeWrapper();
    render(<Wrapper />);

    // "Yo" y "Marta" aparecen en el resumen y en la lista. Usamos
    // la lista (ul) como scope.
    const lists = screen.getAllByRole("list");
    const splitsList = lists.find((l) =>
      l.querySelector("li")?.textContent?.includes("Yo"),
    );
    expect(splitsList).toBeDefined();
    expect(within(splitsList!).getByText("Yo")).toBeInTheDocument();
    expect(within(splitsList!).getByText("Marta")).toBeInTheDocument();
    // Cada uno con su importe.
    const items = within(splitsList!).getAllByRole("listitem");
    expect(items.length).toBe(2);
    expect(within(items[0]!).getByText("6,00 EUR")).toBeInTheDocument();
    expect(within(items[1]!).getByText("6,00 EUR")).toBeInTheDocument();
  });

  it("muestra el método de reparto correcto: 'Partes iguales'", async () => {
    const { Wrapper } = makeWrapper();
    render(<Wrapper />);

    expect(screen.getByText("Partes iguales")).toBeInTheDocument();
  });

  it("muestra los porcentajes calculados en el reparto por porcentaje", async () => {
    // amountCents: 1200. 600 → 50 %, 600 → 50 %.
    const expensePct: ExpenseWithSplits = {
      ...baseExpense,
      splitMethod: "percentage",
      splits: [
        { id: "s-1", expenseId: "e-1", userId: ME, owedAmountCents: 600 },
        { id: "s-2", expenseId: "e-1", userId: OTHER, owedAmountCents: 600 },
      ],
    };
    const { Wrapper } = makeWrapper(expensePct);
    render(<Wrapper />);

    // 50 % en cada fila. Buscamos dentro de la lista para
    // evitar matches con otros elementos.
    const lists = screen.getAllByRole("list");
    const splitsList = lists.find((l) =>
      l.querySelector("li")?.textContent?.includes("Yo"),
    );
    expect(splitsList).toBeDefined();
    const items = within(splitsList!).getAllByRole("listitem");
    expect(items.length).toBe(2);
    expect(within(items[0]!).getByText(/50/)).toBeInTheDocument();
    expect(within(items[1]!).getByText(/50/)).toBeInTheDocument();
  });

  it("llama a onOpenChange(false) al pulsar 'Cerrar'", async () => {
    const user = userEvent.setup();
    const { Wrapper, onOpenChange } = makeWrapper();
    render(<Wrapper />);

    const closeButton = screen.getByRole("button", { name: /Cerrar/i });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("no muestra contenido del gasto si expense es null", async () => {
    const { Wrapper } = makeWrapper(null);
    render(<Wrapper />);

    // El Sheet sigue montado, pero el Detail no se renderiza. El
    // header de la descripción no aparece.
    expect(
      screen.queryByRole("heading", { name: "Cena del viernes" }),
    ).not.toBeInTheDocument();
  });
});
