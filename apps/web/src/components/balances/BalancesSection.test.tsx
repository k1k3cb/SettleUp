// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BalancesSection } from "./BalancesSection";
import type { GroupBalances, Settlement, Transfer } from "@/types/group";
import type { GroupMember } from "@/services/members";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(
  body: unknown,
  status: number = 200,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const GROUP_ID = "g-1";
const ME = "u-me";
const OTHER = "u-other";

const members: GroupMember[] = [
  { userId: ME, name: "Yo", joinedAt: "2026-07-01T00:00:00Z" },
  { userId: OTHER, name: "Marta", joinedAt: "2026-07-02T00:00:00Z" },
];

const transfer: Transfer = {
  fromUserId: ME,
  fromName: "Yo",
  toUserId: OTHER,
  toName: "Marta",
  amountCents: 600,
};

const balancesWithTransfer: GroupBalances = {
  balances: [
    { userId: ME, name: "Yo", amountCents: -600 },
    { userId: OTHER, name: "Marta", amountCents: 600 },
  ],
  transfers: [transfer],
  myBalanceCents: -600,
  isSettled: false,
};

const balancesSettled: GroupBalances = {
  balances: [
    { userId: ME, name: "Yo", amountCents: 0 },
    { userId: OTHER, name: "Marta", amountCents: 0 },
  ],
  transfers: [],
  myBalanceCents: 0,
  isSettled: true,
};

const settlement: Settlement = {
  id: "settle-1",
  groupId: GROUP_ID,
  fromUser: ME,
  toUser: OTHER,
  amountCents: 600,
  status: "confirmed",
  createdAt: "2026-07-27T20:00:00Z",
  confirmedAt: "2026-07-27T20:00:00Z",
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return { queryClient };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("<BalancesSection /> — liquidación", () => {
  it("muestra las transferencias pendientes y el balance del usuario", async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/balances") && (!input.method || input.method === "GET")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "success",
            data: balancesWithTransfer,
          }),
        } as Response);
      }
      if (url.endsWith("/settlements") && (!input.method || input.method === "GET")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "success", data: [] }),
        } as Response);
      }
      return Promise.reject(new Error(`fetch no mockeado: ${url}`));
    });

    const { queryClient } = makeWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <BalancesSection
          groupId={GROUP_ID}
          currentUserId={ME}
          currentUserName="Yo"
          members={members}
        />
      </QueryClientProvider>,
    );

    // El nombre "Yo" aparece varias veces (en el resumen y en la
    // transferencia). Buscamos el contexto donde dice "le debe 6,00
    // EUR a Marta".
    const transferLine = await screen.findByText(/le debe/i);
    const transferList = transferLine.closest("li");
    expect(transferList).not.toBeNull();
    expect(within(transferList!).getByText("6,00 EUR")).toBeInTheDocument();
    expect(within(transferList!).getByText("Marta")).toBeInTheDocument();

    // El balance "Debes 6,00 EUR a alguien." está partido en varios
    // <span>s. Comprobamos cada parte por separado usando los
    // contextos (resumen vs transferencia).
    const resumen = screen
      .getByText(/^Tu saldo$/i)
      .closest("p")!
      .parentElement!;
    expect(within(resumen).getByText(/^Debes$/)).toBeInTheDocument();
    expect(within(resumen).getByText("6,00 EUR")).toBeInTheDocument();
    expect(within(resumen).getByText(/a alguien\./)).toBeInTheDocument();

    // El botón "Saldar" está porque currentUserId es el deudor.
    expect(
      screen.getByRole("button", { name: /Saldar/i }),
    ).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay transferencias", async () => {
    fetchMock.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/balances") && (!input.method || input.method === "GET")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "success", data: balancesSettled }),
        } as Response);
      }
      if (url.endsWith("/settlements") && (!input.method || input.method === "GET")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "success", data: [] }),
        } as Response);
      }
      return Promise.reject(new Error(`fetch no mockeado: ${url}`));
    });

    const { queryClient } = makeWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <BalancesSection
          groupId={GROUP_ID}
          currentUserId={ME}
          currentUserName="Yo"
          members={members}
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/No hay deudas pendientes/i),
    ).toBeInTheDocument();
    // El balance personal se actualiza a "No debes nada."
    expect(screen.getByText(/No debes nada/i)).toBeInTheDocument();
  });

  it("saldar una transferencia la quita de la lista y muestra la liquidación", async () => {
    const user = userEvent.setup();

    // Mock dinámico: GET balances devuelve con/sin transferencia
    // según el estado; GET settlements devuelve vacío inicialmente y
    // con un settlement tras el POST. El POST devuelve el settlement
    // recién creado.
    let balancesState: GroupBalances = balancesWithTransfer;
    let settlementsState: Settlement[] = [];

    fetchMock.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      const method = input.method ?? "GET";
      // eslint-disable-next-line no-console
      console.log("[test fetch]", method, url);
      if (url.endsWith("/balances") && method === "GET") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "success", data: balancesState }),
        } as Response);
      }
      if (url.endsWith("/settlements") && method === "GET") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "success", data: settlementsState }),
        } as Response);
      }
      if (url.endsWith("/settlements") && method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ status: "success", data: settlement }),
        } as Response);
      }
      throw new Error(`fetch no mockeado: ${method} ${url}`);
    });

    const { queryClient } = makeWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <BalancesSection
          groupId={GROUP_ID}
          currentUserId={ME}
          currentUserName="Yo"
          members={members}
        />
      </QueryClientProvider>,
    );

    // Espero a la transferencia inicial.
    const transferLine = await screen.findByText(/le debe/i);
    const transferList = transferLine.closest("li");
    expect(within(transferList!).getByText("6,00 EUR")).toBeInTheDocument();

    // Pulso "Saldar".
    const settleButton = screen.getByRole("button", { name: /Saldar/i });
    // eslint-disable-next-line no-console
    console.log("[test] about to click Saldar, disabled:", (settleButton as HTMLButtonElement).disabled);
    await user.click(settleButton);
    // eslint-disable-next-line no-console
    console.log("[test] click returned, waiting for mutation...");

    // Tras el POST, la mutación invalida balances y settlements.
    // Marcamos los nuevos estados AHORA para que cuando el refetch
    // se dispare, reciba los datos actualizados.
    balancesState = balancesSettled;
    settlementsState = [settlement];

    // Esperamos a que la sección Liquidaciones muestre el nuevo
    // pago. Es la señal más clara de que la mutación ha completado
    // y los refetches han vuelto. Timeout amplio porque jsdom + el
    // árbol de mutaciones de TanStack Query puede tardar en el
    // primer test.
    expect(
      await screen.findByText(/saldó/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();

    // Y a que la lista de transferencias pendientes esté vacía.
    expect(
      await screen.findByText(/No hay deudas pendientes/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();

    // El importe del settlement aparece en la sección Liquidaciones.
    const liquidatedSection = screen
      .getByText(/Liquidaciones/i)
      .closest("article");
    expect(liquidatedSection).not.toBeNull();
    expect(within(liquidatedSection!).getByText("6,00 EUR")).toBeInTheDocument();
  });
});
