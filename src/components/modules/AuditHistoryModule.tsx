import React from "react";
import { FlipItem } from "../../types";
import { History } from "lucide-react";

interface AuditHistoryModuleProps {
  flips: FlipItem[];
}

export const AuditHistoryModule: React.FC<AuditHistoryModuleProps> = ({ flips }) => {
  const allLogs = flips.flatMap((f) =>
    (f.timeline || []).map((tl) => ({ ...tl, flipTitle: f.title }))
  );

  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-[#121212]" />
            <span>Auditoría de Estados & Medición de Tiempos Logísticos</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Historial Operativo ({allLogs.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Trazabilidad completa segundo a segundo de cada cambio de etapa en la plataforma.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
        <div className="relative border-l border-[#e6e4e0] ml-4 pl-6 space-y-6">
          {allLogs.map((log) => (
            <div key={log.id} className="relative group">
              <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-[#121212]"></div>
              <div className="text-[10px] font-mono text-[#616161]">
                {new Date(log.timestamp).toLocaleString("es-VE")} • Actor: <span className="text-[#121212] font-semibold">{log.actor}</span>
              </div>
              <h4 className="font-serif text-sm font-normal text-[#121212] mt-0.5">{log.title}</h4>
              <p className="text-[#616161] text-xs mt-0.5 font-sans">{log.description}</p>
              <div className="text-[11px] text-[#616161] mt-1 font-medium">{log.flipTitle}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
