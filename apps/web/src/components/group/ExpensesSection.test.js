import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ExpensesSection } from "./ExpensesSection";
// Mock global de fetch. `api.ts` lo usa directamente. Por path y
// método devolvemos el JSON que espera la forma del backend
// (`{ data: ... }` para éxito, `{ message, status }` para error).
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;
const GROUP_ID = "g-1";
const ME = "u-me";
const OTHER = "u-other";
const members = [
    { userId: ME, name: "Yo", joinedAt: "2026-07-01T00:00:00Z" },
    { userId: OTHER, name: "Marta", joinedAt: "2026-07-02T00:00:00Z" },
];
function mockListResponse(expenses = []) {
    return {
        ok: true,
        status: 200,
        json: async () => ({ status: "success", data: expenses }),
    };
}
function mockCreateResponse(expense) {
    return {
        ok: true,
        status: 201,
        json: async () => ({ status: "success", data: expense }),
    };
}
/**
 * Wrapper con un QueryClient fresco por test (importante: no
 * compartir cache entre tests) y un state local para el form.
 * Devuelve la API del test: la query client (para inspeccionar) y
 * los handles de abrir/cerrar.
 */
function makeWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    function Wrapper({ members, membersLoading = false, membersError = null, }) {
        const [formOpen, setFormOpen] = useState(false);
        return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ExpensesSection, { groupId: GROUP_ID, currentUserId: ME, members: members, membersLoading: membersLoading, membersError: membersError, formOpen: formOpen, onOpenForm: () => setFormOpen(true), onCloseForm: () => setFormOpen(false) }) }));
    }
    return { Wrapper, queryClient };
}
beforeEach(() => {
    fetchMock.mockReset();
    // Por defecto, GET /expenses devuelve lista vacía. Cada test
    // sobreescribe el comportamiento que necesita.
    fetchMock.mockImplementation((input) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.endsWith("/expenses") && (!input.method || input.method === "GET")) {
            return Promise.resolve(mockListResponse());
        }
        return Promise.reject(new Error(`fetch no mockeado: ${url}`));
    });
});
describe("<ExpensesSection /> — lista", () => {
    it("muestra el estado vacío cuando no hay apuntes", async () => {
        const { Wrapper } = makeWrapper();
        render(_jsx(Wrapper, { members: members }));
        // Tras la carga, aparece la invitación a anotar el primer gasto.
        expect(await screen.findByText(/Anota el primer gasto de la cuenta/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Anotar gasto/i })).toBeEnabled();
    });
    it("muestra el botón deshabilitado si no hay miembros", async () => {
        const { Wrapper } = makeWrapper();
        render(_jsx(Wrapper, { members: [] }));
        // Espera al render del estado sin miembros (length===0 → canOpenForm=false).
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Anotar gasto/i })).toBeDisabled();
        });
    });
});
describe("<ExpensesSection /> — flujo de crear gasto", () => {
    it("anota un gasto a partes iguales y lo muestra en la lista", async () => {
        const user = userEvent.setup();
        // 1) Mock de GET inicial: lista vacía.
        // 2) Mock de POST: devuelve el gasto recién creado con su id.
        const createdExpense = {
            id: "e-1",
            groupId: GROUP_ID,
            description: "Cena del viernes",
            amountCents: 1200,
            currency: "EUR",
            paidBy: ME,
            splitMethod: "equal",
            isCancelled: false,
            createdAt: "2026-07-27T20:00:00Z",
            splits: [
                { id: "s-1", expenseId: "e-1", userId: ME, owedAmountCents: 600 },
                { id: "s-2", expenseId: "e-1", userId: OTHER, owedAmountCents: 600 },
            ],
        };
        // Mock de GET: al principio vacío. Después del POST, la mutación
        // invalida la query y se vuelve a fetchear, devolviendo la lista
        // con el gasto creado. Configuramos el mock ANTES del envío
        // porque el refetch puede dispararse inmediatamente al invalidarse.
        fetchMock.mockImplementation((input) => {
            const url = typeof input === "string" ? input : input.url;
            if (url.endsWith("/expenses") && (!input.method || input.method === "GET")) {
                return Promise.resolve(mockListResponse([createdExpense]));
            }
            if (url.endsWith("/expenses") && input.method === "POST") {
                return Promise.resolve(mockCreateResponse(createdExpense));
            }
            return Promise.reject(new Error(`fetch no mockeado: ${url}`));
        });
        const { Wrapper } = makeWrapper();
        render(_jsx(Wrapper, { members: members }));
        // Espero a que termine la carga inicial y aparezca el botón.
        const openButton = await screen.findByRole("button", {
            name: /Anotar gasto/i,
        });
        // 2) Abrir el form.
        await user.click(openButton);
        // 3) Llenar el form: descripción, importe, y dejar "Partes
        // iguales" (que es el valor por defecto).
        const descInput = await screen.findByLabelText(/Descripción/i);
        await user.type(descInput, "Cena del viernes");
        const amountInput = await screen.findByLabelText(/Importe/i);
        await user.type(amountInput, "12");
        // 4) Confirmar: la pagador es "Yo" por defecto, y todos los
        // miembros están seleccionados por defecto. La suma cuadra, el
        // botón "Anotar gasto" se habilita.
        const submitButton = screen.getByRole("button", { name: /Anotar gasto/i });
        await waitFor(() => expect(submitButton).toBeEnabled());
        // 5) Enviar.
        await user.click(submitButton);
        // 6) Verificar que el gasto aparece en la lista con su
        // descripción y el importe formateado.
        const item = await screen.findByText("Cena del viernes");
        expect(item).toBeInTheDocument();
        // El importe se imprime como "12,00 EUR" (es-ES, dos decimales).
        const list = item.closest("li");
        expect(list).not.toBeNull();
        expect(within(list).getByText("12,00 EUR")).toBeInTheDocument();
    });
});
