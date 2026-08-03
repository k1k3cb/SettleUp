import { useParams } from "react-router-dom";
/**
 * Lee el `groupId` desde la URL. Lo usan los componentes que viven
 * fuera del árbol de la página (por ejemplo `ExpenseRow`, que está
 * mapeado dentro de `ExpensesSection`) y necesitan el id para
 * construir hooks de mutación (`useCancelExpense(groupId)`).
 */
export function useGroupId() {
    const { id } = useParams();
    return id ?? "";
}
