import React from "react";
import { FlipItem, Transaction, Client } from "../../types";
import { Download, FileSpreadsheet, FileJson } from "lucide-react";

interface ExportsModuleProps {
  flips: FlipItem[];
  transactions: Transaction[];
  clients: Client[];
}

export const ExportsModule: React.FC<ExportsModuleProps> = ({ flips, transactions, clients }) => {
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ flips, transactions, clients }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FlipTrack_Backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Title,Platform,Category,LandedCostUSD,MarketVzlaUSD,NetProfitUSD,ROI,Status\n";
    flips.forEach((f) => {
      const math = f.analysis?.flipMath;
      csvContent += `"${f.id}","${f.title.replace(/"/g, '""')}","${f.platform}","${f.category}",${math?.totalLandedCostUSD || 0},${math?.estimatedMarketPriceVzlaUSD || 0},${math?.netProfitUSD || 0},${math?.roiPercent || 0},"${f.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FlipTrack_Flips_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <Download className="w-3.5 h-3.5 text-[#121212]" />
            <span>Exportación de Datos & Respaldo Contable</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Exportar Reportes & Base de Datos</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Descarga copias de seguridad completas en formato JSON o planillas ejecutivas CSV para Excel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
          <div className="flex items-center space-x-3 text-[#121212]">
            <FileSpreadsheet className="w-8 h-8 text-[#121212]" />
            <div>
              <h3 className="font-serif text-base font-normal text-[#121212]">Exportar a Planilla CSV (Excel)</h3>
              <p className="text-xs text-[#616161]">Resumen numérico de costos landed, ROI y ventas.</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full bg-[#121212] hover:bg-[#282828] text-white font-medium py-2.5 rounded-full text-xs transition shadow-none"
          >
            Descargar Archivo CSV (.csv)
          </button>
        </div>

        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none space-y-4">
          <div className="flex items-center space-x-3 text-[#121212]">
            <FileJson className="w-8 h-8 text-[#121212]" />
            <div>
              <h3 className="font-serif text-base font-normal text-[#121212]">Respaldo Completo de Sistema (JSON)</h3>
              <p className="text-xs text-[#616161]">Copia de seguridad integra de flips, transacciones y clientes.</p>
            </div>
          </div>
          <button
            onClick={handleExportJSON}
            className="w-full bg-[#121212] hover:bg-[#282828] text-white font-medium py-2.5 rounded-full text-xs transition shadow-none"
          >
            Descargar Respaldo JSON (.json)
          </button>
        </div>
      </div>
    </div>
  );
};
