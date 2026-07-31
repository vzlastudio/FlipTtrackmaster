import React from "react";
import { AppSettings } from "../types";
import {
  Sparkles,
  TrendingUp,
  RefreshCw,
  Bell,
  Cpu,
  DollarSign,
  PlusCircle,
  Truck,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import { formatVES } from "../lib/currency";

interface NavbarProps {
  settings: AppSettings;
  onOpenAnalyzer: () => void;
  onSelectModule: (module: string) => void;
  inTransitCount: number;
  inRepairCount: number;
  listedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onOpenAnalyzer,
  onSelectModule,
  inTransitCount,
  inRepairCount,
  listedCount,
}) => {
  return (
    <header className="bg-white border-b border-[#e6e4e0] text-[#121212] sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Tag */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectModule("dashboard")}>
          <div className="w-9 h-9 rounded-full bg-[#121212] flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-xl tracking-tight text-[#121212]">
                FlipTrack
              </span>
              <span className="bg-[#e6e4e0] text-[#121212] text-[10px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Vzla OS
              </span>
            </div>
            <p className="text-[11px] text-[#616161]">Motor IA FlipMaster • Courier Liberty</p>
          </div>
        </div>

        {/* Exchange Rate Ticker & Quick Stats */}
        <div className="hidden lg:flex items-center space-x-4 bg-[#dbdad7]/40 border border-[#e6e4e0] rounded-full px-4 py-1.5 text-xs">
          <div className="flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-[#121212]" />
            <span className="text-[#616161]">Tasa Paralelo:</span>
            <span className="font-semibold text-[#121212]">{formatVES(settings.paraleloRate)}</span>
          </div>
          <div className="h-3 w-px bg-[#e6e4e0]"></div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[#616161]">BCV:</span>
            <span className="font-medium text-[#121212]">{formatVES(settings.bcvRate)}</span>
          </div>
          <div className="h-3 w-px bg-[#e6e4e0]"></div>
          <div className="flex items-center space-x-1.5 text-[#616161]">
            <Cpu className="w-3.5 h-3.5 text-[#121212]" />
            <span className="font-mono text-[11px] text-[#121212]">
              {settings.aiModel === "nvidia-nim-deepseek"
                ? "NVIDIA NIM (DeepSeek)"
                : settings.aiModel === "deepseek-ai/deepseek-v4-pro"
                ? "NVIDIA DeepSeek V4 Pro"
                : settings.aiModel === "gemini-3.6-flash"
                ? "Gemini 3.6 Flash"
                : settings.aiModel}
            </span>
          </div>
        </div>

        {/* Operational Status Badges & Quick AI Action */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => onSelectModule("logistics")}
            className="hidden sm:flex items-center space-x-2 bg-white hover:bg-[#dbdad7]/30 text-[#121212] text-xs font-medium px-3 py-1.5 rounded-full border border-[#e6e4e0] transition"
            title="Ver Flips en Tránsito"
          >
            <Truck className="w-3.5 h-3.5 text-[#616161]" />
            <span>Tránsito</span>
            <span className="bg-[#121212] text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
              {inTransitCount}
            </span>
          </button>

          <button
            onClick={() => onSelectModule("repairs")}
            className="hidden sm:flex items-center space-x-2 bg-white hover:bg-[#dbdad7]/30 text-[#121212] text-xs font-medium px-3 py-1.5 rounded-full border border-[#e6e4e0] transition"
            title="Ver Flips en Taller / Reparación"
          >
            <Wrench className="w-3.5 h-3.5 text-[#616161]" />
            <span>Taller</span>
            <span className="bg-[#e6e4e0] text-[#121212] font-mono text-[10px] px-2 py-0.5 rounded-full">
              {inRepairCount}
            </span>
          </button>

          <button
            onClick={onOpenAnalyzer}
            className="flex items-center space-x-2 bg-[#121212] hover:bg-[#282828] text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-full transition active:scale-95 shadow-none"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Analizar Oferta IA</span>
          </button>
        </div>
      </div>
    </header>
  );
};
