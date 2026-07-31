import React from "react";
import {
  LayoutDashboard,
  Sparkles,
  BookmarkCheck,
  ShoppingBag,
  Truck,
  Wrench,
  Boxes,
  Tag,
  DollarSign,
  Users,
  FolderOpen,
  History,
  BarChart3,
  Download,
  Settings,
  ChevronRight,
  RefreshCw,
  Calculator,
  Store,
} from "lucide-react";

interface SidebarProps {
  currentModule: string;
  onSelectModule: (module: string) => void;
  badgeCounts: {
    opportunities: number;
    purchases: number;
    logistics: number;
    repairs: number;
    inventory: number;
    sales: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  badgeCounts,
}) => {
  const menuGroups = [
    {
      title: "CEREBRO IA",
      items: [
        {
          id: "analyzer",
          label: "AI Analyzer (FlipMaster)",
          icon: Sparkles,
          badge: "IA",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        },
        {
          id: "opportunities",
          label: "Oportunidades",
          icon: BookmarkCheck,
          badge: badgeCounts.opportunities ? String(badgeCounts.opportunities) : undefined,
          badgeColor: "bg-slate-800 text-slate-300",
        },
      ],
    },
    {
      title: "OPERACIONES & LOGÍSTICA",
      items: [
        {
          id: "dashboard",
          label: "Dashboard Operativo",
          icon: LayoutDashboard,
        },
        {
          id: "purchases",
          label: "Compras",
          icon: ShoppingBag,
          badge: badgeCounts.purchases ? String(badgeCounts.purchases) : undefined,
        },
        {
          id: "logistics",
          label: "Tránsito & Logística",
          icon: Truck,
          badge: badgeCounts.logistics ? String(badgeCounts.logistics) : undefined,
          badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        },
        {
          id: "repairs",
          label: "Reparaciones (Taller)",
          icon: Wrench,
          badge: badgeCounts.repairs ? String(badgeCounts.repairs) : undefined,
          badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        },
        {
          id: "inventory",
          label: "Inventario",
          icon: Boxes,
          badge: badgeCounts.inventory ? String(badgeCounts.inventory) : undefined,
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
      ],
    },
    {
      title: "COMERCIAL & FINANZAS",
      items: [
        {
          id: "sales",
          label: "Ventas & Publicaciones",
          icon: Tag,
          badge: badgeCounts.sales ? String(badgeCounts.sales) : undefined,
        },
        {
          id: "transactions",
          label: "Transacciones & Caja",
          icon: DollarSign,
        },
        {
          id: "clients",
          label: "Clientes & Garantías",
          icon: Users,
        },
      ],
    },
    {
      title: "DOCUMENTOS & ARCHIVOS",
      items: [
        {
          id: "documents",
          label: "Inbox Documental",
          icon: FolderOpen,
        },
        {
          id: "audit",
          label: "Historial & Auditoría",
          icon: History,
        },
      ],
    },
    {
      title: "INTELIGENCIA & SISTEMA",
      items: [
        {
              id: "ebaysync",
              label: "eBay Sync & Watchlist",
              icon: RefreshCw,
              badge: "Sync",
              badgeColor: "bg-blue-500/20 text-blue-300",
            },
            {
              id: "tiendas",
              label: "Tiendas eBay",
              icon: Store,
              badge: "MCP",
              badgeColor: "bg-violet-500/20 text-violet-300",
            },
        {
          id: "calculators",
          label: "Calculadoras (Flete/ROI)",
          icon: Calculator,
        },
        {
          id: "reports",
          label: "Reportes ROI & Tiempos",
          icon: BarChart3,
        },
        {
          id: "exports",
          label: "Exportaciones",
          icon: Download,
        },
        {
          id: "settings",
          label: "Configuración & APIs",
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#e6e4e0] text-[#121212] flex flex-col h-full select-none shrink-0 overflow-y-auto">
      <div className="p-3 space-y-5">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-sans font-medium text-[#616161] uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-medium transition group ${
                      isActive
                        ? "bg-[#121212] text-white"
                        : "hover:bg-[#dbdad7]/50 text-[#616161] hover:text-[#121212]"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 transition ${
                          isActive ? "text-white" : "text-[#616161] group-hover:text-[#121212]"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-[#e6e4e0] text-[#121212]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto p-3 border-t border-[#e6e4e0] bg-[#dbdad7]/20 text-[11px] text-[#616161] text-center">
        <span>FlipTrack Vzla v2.4 • Casillero Miami</span>
      </div>
    </aside>
  );
};
