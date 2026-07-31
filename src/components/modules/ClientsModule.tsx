import React from "react";
import { Client } from "../../types";
import { Users, Phone, MapPin } from "lucide-react";
import { formatUSD } from "../../lib/currency";

interface ClientsModuleProps {
  clients: Client[];
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({ clients }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-[#121212]" />
            <span>Base de Datos de Compradores & Garantías Activas</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Directorio de Clientes ({clients.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Historial de compras en Venezuela, ciudad, canal preferido y registro de garantías vigentes de 30 días.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((cli) => (
          <div key={cli.id} className="bg-white border border-[#e6e4e0] rounded-lg p-5 shadow-none space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-base font-normal text-[#121212]">{cli.name}</h3>
                <div className="flex items-center space-x-1.5 text-xs text-[#616161] mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#121212]" />
                  <span>{cli.city}</span>
                </div>
              </div>

              <span className="bg-[#e6e4e0] text-[#121212] font-medium text-[10px] px-2.5 py-0.5 rounded-full">
                {cli.preferredChannel}
              </span>
            </div>

            <div className="bg-[#dbdad7]/20 p-3 rounded-lg border border-[#e6e4e0] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[#616161] uppercase font-medium">Compras Totales</span>
                <div className="font-serif text-sm font-normal text-[#121212]">{cli.totalPurchasesCount} Equipos</div>
              </div>

              <div>
                <span className="text-[10px] text-[#616161] uppercase font-medium">Inversión Acumulada</span>
                <div className="font-bold text-[#1a5336]">{formatUSD(cli.totalSpentUSD)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#616161] pt-2 border-t border-[#e6e4e0]">
              <div className="flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-[#616161]" />
                <span className="font-mono text-[#121212]">{cli.phone}</span>
              </div>
              <span>Última Compra: {cli.lastPurchaseDate || "Reciente"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
