import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function GroupSkeleton() {
    return (_jsx("div", { className: "mt-10 sm:mt-12 receipt", children: _jsxs("div", { className: "bg-card border-x border-ink/12 px-7 py-7 sm:px-9 space-y-5", children: [_jsx("div", { className: "h-3 w-20 bg-ink/10" }), _jsx("div", { className: "h-9 w-3/4 bg-ink/10" }), _jsx("div", { className: "h-3 w-1/2 bg-ink/10" }), _jsx("div", { className: "h-14 w-full bg-ink/5 mt-6" }), _jsx("div", { className: "h-3 w-2/3 bg-ink/5" })] }) }));
}
export function SignersSkeleton({ count }) {
    return (_jsx("ul", { className: "divide-y divide-ink/10", children: Array.from({ length: count }).map((_, i) => (_jsxs("li", { className: "px-7 py-4 sm:px-9 flex items-center gap-4", "aria-hidden": true, children: [_jsx("span", { className: "size-2 rounded-full bg-ink/10" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-3.5 w-32 bg-ink/10" }), _jsx("div", { className: "h-2.5 w-24 bg-ink/5" })] })] }, i))) }));
}
export function BalancesSkeleton() {
    return (_jsx("ul", { className: "mt-3 divide-y divide-ink/10", "aria-hidden": true, children: [0, 1].map((i) => (_jsxs("li", { className: "py-3 flex items-center gap-3", children: [_jsx("span", { className: "size-2 rounded-full bg-ink/10" }), _jsx("div", { className: "flex-1 h-3.5 bg-ink/10" }), _jsx("div", { className: "w-12 h-3.5 bg-ink/10" })] }, i))) }));
}
