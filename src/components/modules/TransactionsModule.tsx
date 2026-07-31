import React, { useState } from "react";
import { Transaction, AppSettings } from "../../types";
import { DollarSign, ArrowUpRight, ArrowDownLeft, PlusCircle, Filter } from "lucide-react";
import { formatUSD, formatVES } from "../../lib/currency";

interface TransactionsModuleProps {
  transactions: Transaction[];
  settings: AppSettings;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
}

export const TransactionsModule: React.FC<TransactionsModuleProps> = ({
  transactions,
  settings,
  onAddTransaction,
}) => {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [category, setCategory] = useState<Transaction["category"]>("Compra Producto");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amountUSD, setAmountUSD] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Transaction["paymentMethod"]>("Zelle");
  const [notes, setNotes] = useState("");

  const filtered = transactions.filter((tx) => filterType === "all" || tx.type === filterType);

  const totalIncomesUSD = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amountUSD, 0);

  const totalExpensesUSD = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amountUSD, 0);

  const netBalanceUSD = totalIncomesUSD - totalExpensesUSD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountUSD) || 0;
    if (val <= 0) return;

    onAddTransaction({
      date: new Date().toISOString().split("T")[0],
      type,
      category,
      amountUSD: val,
      amountVES: val * settings.paraleloRate,
      exchangeRate: settings.paraleloRate,
      currency: "USD",
      paymentMethod,
      notes,
    });

    setAmountUSD("");
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-[#121212]" />
            <span>Libro Diario de Caja & Flujo de Efectivo Dual (USD / VES)</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Transacciones & Finanzas</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Control contable unificado de compras de producto, fletes Liberty Express, piezas de repuesto e ingresos por ventas en Zelle, Pago Móvil y Efectivo.
          </p>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none">
          <div className="flex items-center justify-between text-xs font-medium text-[#616161] uppercase">
            <span>Ingresos Totales</span>
            <ArrowUpRight className="w-4 h-4 text-[#1a5336]" />
          </div>
          <div className="text-2xl font-serif font-normal text-[#1a5336] mt-2">{formatUSD(totalIncomesUSD)}</div>
          <div className="text-xs text-[#616161] font-mono mt-1">{formatVES(totalIncomesUSD * settings.paraleloRate)}</div>
        </div>

        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none">
          <div className="flex items-center justify-between text-xs font-medium text-[#616161] uppercase">
            <span>Egresos / Gastos</span>
            <ArrowDownLeft className="w-4 h-4 text-[#991b1b]" />
          </div>
          <div className="text-2xl font-serif font-normal text-[#991b1b] mt-2">{formatUSD(totalExpensesUSD)}</div>
          <div className="text-xs text-[#616161] font-mono mt-1">{formatVES(totalExpensesUSD * settings.paraleloRate)}</div>
        </div>

        <div className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none">
          <div className="flex items-center justify-between text-xs font-medium text-[#616161] uppercase">
            <span>Balance Neto Caja</span>
            <DollarSign className="w-4 h-4 text-[#121212]" />
          </div>
          <div className={`text-2xl font-serif font-normal mt-2 ${netBalanceUSD >= 0 ? "text-[#121212]" : "text-[#991b1b]"}`}>
            {formatUSD(netBalanceUSD)}
          </div>
          <div className="text-xs text-[#616161] font-mono mt-1">{formatVES(netBalanceUSD * settings.paraleloRate)}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-normal text-[#121212] uppercase tracking-wider">Historial de Movimientos de Caja</h3>
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-full font-medium transition ${filterType === "all" ? "bg-[#121212] text-white" : "bg-[#e6e4e0] text-[#616161]"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`px-3 py-1 rounded-full font-medium transition ${filterType === "income" ? "bg-[#121212] text-white" : "bg-[#e6e4e0] text-[#616161]"}`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`px-3 py-1 rounded-full font-medium transition ${filterType === "expense" ? "bg-[#121212] text-white" : "bg-[#e6e4e0] text-[#616161]"}`}
            >
              Egresos
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#121212]">
            <thead className="bg-[#dbdad7]/30 text-[#616161] font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-lg">Fecha</th>
                <th className="p-3">Categoría / Notas</th>
                <th className="p-3">Flip Asociado</th>
                <th className="p-3">Método Pago</th>
                <th className="p-3">Monto USD</th>
                <th className="p-3 text-right rounded-r-lg">Monto VES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4e0]">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#dbdad7]/20 transition">
                  <td className="p-3 font-mono text-[#616161] text-[11px]">{tx.date}</td>

                  <td className="p-3">
                    <div className="font-serif text-sm font-normal text-[#121212]">{tx.category}</div>
                    <div className="text-[11px] text-[#616161]">{tx.notes}</div>
                  </td>

                  <td className="p-3 font-medium text-[#121212]">
                    {tx.flipTitle || "General Caja"}
                  </td>

                  <td className="p-3 font-mono text-[11px]">
                    <span className="bg-[#e6e4e0] px-2 py-0.5 rounded-full text-[#121212] font-medium">{tx.paymentMethod}</span>
                  </td>

                  <td className={`p-3 font-bold text-sm ${tx.type === "income" ? "text-[#1a5336]" : "text-[#991b1b]"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatUSD(tx.amountUSD)}
                  </td>

                  <td className="p-3 text-right font-mono text-[#616161]">
                    {formatVES(tx.amountVES)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <h3 className="text-sm font-serif font-normal text-[#121212] uppercase tracking-wider flex items-center space-x-2">
          <PlusCircle className="w-4 h-4 text-[#121212]" />
          <span>Registrar Nuevo Movimiento Manual</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Tipo de Movimiento</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="expense">Egreso (Gasto)</option>
              <option value="income">Ingreso (Entrada)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="Compra Producto">Compra Producto</option>
              <option value="Envío US">Envío US</option>
              <option value="Courier Int. (Liberty)">Courier Int. (Liberty)</option>
              <option value="Repuestos">Repuestos Taller</option>
              <option value="Mano de Obra">Mano de Obra Técnico</option>
              <option value="Ingreso Venta">Ingreso Venta</option>
              <option value="Otros">Otros Gastos</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Monto en USD ($)</label>
            <input
              type="number"
              step="0.01"
              value={amountUSD}
              onChange={(e) => setAmountUSD(e.target.value)}
              placeholder="35.00"
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212] font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#616161] mb-1">Método de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
            >
              <option value="Zelle">Zelle US</option>
              <option value="Pago Móvil">Pago Móvil VES</option>
              <option value="Efectivo USD">Efectivo USD Cash</option>
              <option value="Binance USDT">Binance USDT P2P</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#616161] mb-1">Notas / Referencia</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Pago de flete aéreo Liberty Express guía LIB-9910"
            className="w-full bg-white border border-[#e6e4e0] rounded-lg p-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs px-5 py-2 rounded-full transition shadow-none"
          >
            Guardar Transacción en Caja
          </button>
        </div>
      </form>
    </div>
  );
};
