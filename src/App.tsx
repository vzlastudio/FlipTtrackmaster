import React, { useState, useEffect } from "react";
import {
  FlipItem,
  FlipModule,
  AppSettings,
  Transaction,
  Client,
  DocumentFile,
  FlipMasterAnalysis,
  SaleInfo,
  PartOrder,
} from "./types";
import { initialFlips, initialTransactions, initialClients, initialDocuments, initialSettings } from "./data/initialData";
import { usePersistentState, usePersistentSingle } from "./hooks/usePersistentState";
import { seedInitialDataIfEmpty, registerEvent } from "./lib/db";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { LandingPage } from "./components/LandingPage";

// Modules
import { DashboardModule } from "./components/modules/DashboardModule";
import { AIAnalyzerModule } from "./components/modules/AIAnalyzerModule";
import { OpportunitiesModule } from "./components/modules/OpportunitiesModule";
import { PurchasesModule } from "./components/modules/PurchasesModule";
import { LogisticsModule } from "./components/modules/LogisticsModule";
import { RepairsModule } from "./components/modules/RepairsModule";
import { InventoryModule } from "./components/modules/InventoryModule";
import { SalesModule } from "./components/modules/SalesModule";
import { TransactionsModule } from "./components/modules/TransactionsModule";
import { ClientsModule } from "./components/modules/ClientsModule";
import { DocumentsInboxModule } from "./components/modules/DocumentsInboxModule";
import { AuditHistoryModule } from "./components/modules/AuditHistoryModule";
import { ReportsModule } from "./components/modules/ReportsModule";
import { ExportsModule } from "./components/modules/ExportsModule";
import { SettingsModule } from "./components/modules/SettingsModule";
import { CalculatorsModule } from "./components/modules/CalculatorsModule";
import { EbaySyncModule } from "./components/modules/EbaySyncModule";
import { TiendasModule } from "./components/modules/TiendasModule";

// Modals
import { FlipDetailModal } from "./components/modals/FlipDetailModal";

export default function App() {
  // ── Routing: / = Landing pública · /app = Sistema operativo ────────────
  const [route, setRoute] = useState<"landing" | "app">(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/app") ? "app" : "landing";
    }
    return "app";
  });

  useEffect(() => {
    const onPop = () => {
      setRoute(window.location.pathname.startsWith("/app") ? "app" : "landing");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goToApp = () => {
    window.history.pushState({}, "", "/app");
    setRoute("app");
    window.scrollTo(0, 0);
  };

  // ── Deep-link por módulo (?m=dashboard|analyzer|logistics|...) ──────────
  // Permite abrir directamente un módulo (útil para capturas y compartir vistas).
  const initialModule = (() => {
    if (typeof window !== "undefined") {
      const m = new URLSearchParams(window.location.search).get("m");
      if (m && [
        "dashboard", "analyzer", "opportunities", "purchases", "logistics",
        "repairs", "inventory", "sales", "transactions", "clients",
        "documents", "audit", "ebaysync", "tiendas", "calculators",
        "reports", "exports", "settings",
      ].includes(m)) {
        return m as FlipModule;
      }
    }
    return "dashboard";
  })();
  const [activeModule, setActiveModule] = useState<FlipModule>(initialModule);
  const [flips, setFlips] = usePersistentState<FlipItem>("flips", initialFlips);
  const [transactions, setTransactions] = usePersistentState<Transaction>("transactions", initialTransactions);
  const [clients, setClients] = usePersistentState<Client>("clients", initialClients);
  const [documents, setDocuments] = usePersistentState<DocumentFile>("documents", initialDocuments);

  const [selectedFlipForModal, setSelectedFlipForModal] = useState<FlipItem | null>(null);

  // Seed initial data once on mount
  useEffect(() => {
    (async () => {
      await seedInitialDataIfEmpty("flips", initialFlips);
      await seedInitialDataIfEmpty("transactions", initialTransactions);
      await seedInitialDataIfEmpty("clients", initialClients);
      await seedInitialDataIfEmpty("documents", initialDocuments);
    })();
  }, []);

  // Ajustes persistidos en IndexedDB (singleton "global") — las API keys y
  // tasas sobreviven al recargar la página. Se siembran desde initialSettings.
  const [settings, updateSettings] = usePersistentSingle<AppSettings>("settings", "global", initialSettings);

  // Handlers
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const patch: Partial<AppSettings> = { ...newSettings };
    if (patch.paraleloRate !== undefined) patch.paraleloRate = Number(Number(patch.paraleloRate).toFixed(2));
    if (patch.bcvRate !== undefined) patch.bcvRate = Number(Number(patch.bcvRate).toFixed(2));
    updateSettings(patch);
  };

  const handleRefreshExchangeRates = async (silent = false) => {
    try {
      const res = await fetch("/api/exchange-rate");
      const json = await res.json();
      if (json.success && json.bcv && json.paralelo) {
        const roundedBCV = Number(Number(json.bcv).toFixed(2));
        const roundedParalelo = Number(Number(json.paralelo).toFixed(2));
        updateSettings({ paraleloRate: roundedParalelo, bcvRate: roundedBCV });
        if (!silent) {
          alert(`Tasas sincronizadas con éxito:\n• Dólar BCV: VES ${roundedBCV.toFixed(2)}\n• Dólar Paralelo: VES ${roundedParalelo.toFixed(2)}`);
        }
      }
    } catch {
      if (!silent) {
        alert("No se pudieron obtener las tasas desde DolarFlow. Se conservan los valores actuales.");
      }
    }
  };

  useEffect(() => {
    handleRefreshExchangeRates(true);
  }, []);

  const handleSaveOpportunity = (analysis: FlipMasterAnalysis, url: string, title: string) => {
    const newFlip: FlipItem = {
      id: `FLIP-${Date.now().toString().slice(-4)}`,
      title: title || `${analysis.productIdentification.brand} ${analysis.productIdentification.model}`,
      brand: analysis.productIdentification.brand,
      model: analysis.productIdentification.model,
      category: analysis.productIdentification.category as any,
      platform: "eBay",
      status: "saved_opportunity",
      sourceUrl: url,
      sourceDescription: analysis.finalVerdict.summaryExplanation,
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      analysis,
      timeline: [
        {
          id: `TL-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "FlipMaster AI",
          title: "Análisis Forense Guardado",
          description: `Oportunidad evaluada con ROI est. ${analysis.flipMath.roiPercent.toFixed(2)}%`,
          stage: "Análisis",
        },
      ],
    };

    setFlips([newFlip, ...flips]);
    setActiveModule("opportunities");
  };

  const handleConvertToFlip = (analysisOrFlip: FlipMasterAnalysis | FlipItem, url?: string, title?: string) => {
    if ("id" in analysisOrFlip) {
      // Existing Flip Item
      setFlips(
        flips.map((f) =>
          f.id === analysisOrFlip.id
            ? {
                ...f,
                status: "purchased",
                updatedAt: new Date().toISOString(),
                purchase: {
                  priceUSD: f.analysis?.flipMath.basePriceUSD || 150,
                  shippingUSUSD: 0,
                  taxUSD: 0,
                  totalUSD: f.analysis?.flipMath.basePriceUSD || 150,
                  purchaseDate: new Date().toISOString().split("T")[0],
                  supplierName: f.platform,
                  paymentMethod: "Zelle",
                },
                logistics: {
                  currentLeg: 1,
                  weightLbs: f.analysis?.shippingToVenezuela.estimatedWeightLbs || 3.5,
                  freightCostUSD: f.analysis?.shippingToVenezuela.totalLandedShippingUSD || 20,
                  trackingUS: `1Z${Math.floor(100000000000000 + Math.random() * 899999999999999)}`,
                  carrierStatusText: "Vendedor envió paquete hacia Casillero Miami",
                },
                timeline: [
                  ...f.timeline,
                  {
                    id: `TL-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    actor: "Usuario",
                    title: "Compra Ejecutada & Tramo 1 Iniciado",
                    description: "Se procesó el pago en origen y se asignó guía internacional.",
                    stage: "Compra",
                  },
                ],
              }
            : f
        )
      );
    } else {
      // Create new active purchased flip from AI Analysis
      const analysis = analysisOrFlip;
      const newFlip: FlipItem = {
        id: `FLIP-${Date.now().toString().slice(-4)}`,
        title: title || `${analysis.productIdentification.brand} ${analysis.productIdentification.model}`,
        brand: analysis.productIdentification.brand,
        model: analysis.productIdentification.model,
        category: analysis.productIdentification.category as any,
        platform: "eBay",
        status: "purchased",
        sourceUrl: url || "",
        sourceDescription: analysis.finalVerdict.summaryExplanation,
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analysis,
        purchase: {
          priceUSD: analysis.flipMath.basePriceUSD,
          shippingUSUSD: 0,
          taxUSD: 0,
          totalUSD: analysis.flipMath.basePriceUSD,
          purchaseDate: new Date().toISOString().split("T")[0],
          supplierName: "eBay",
          paymentMethod: "Zelle",
        },
        logistics: {
          currentLeg: 1,
          weightLbs: analysis.shippingToVenezuela.estimatedWeightLbs,
          freightCostUSD: analysis.shippingToVenezuela.totalLandedShippingUSD,
          trackingUS: `1Z${Math.floor(100000000000000 + Math.random() * 899999999999999)}`,
          carrierStatusText: "En camino a Casillero Doral Miami",
        },
        timeline: [
          {
            id: `TL-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: "Usuario",
            title: "Flip Comprado Directamente",
            description: "Convertido desde análisis AI a lote en tránsito.",
            stage: "Compra",
          },
        ],
      };

      setFlips([newFlip, ...flips]);
    }

    setActiveModule("logistics");
  };

  const handleDeleteFlip = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta oportunidad de la plataforma?")) {
      setFlips(flips.filter((f) => f.id !== id));
    }
  };

  const handleUpdateLogisticsStatus = (
    flipId: string,
    leg: 1 | 2 | 3 | 4,
    patch: {
      statusText?: string;
      trackingUS?: string;
      trackingNumber?: string;
      arrivedMiamiDate?: string;
      arrivedVzlaDate?: string;
      warehouseLocationVzla?: string;
    } = {}
  ) => {
    setFlips(
      flips.map((f) => {
        if (f.id !== flipId) return f;

        let nextStatus = f.status;
        if (leg === 2) nextStatus = "miami_warehouse";
        if (leg === 3) nextStatus = "international_freight";
        if (leg === 4) nextStatus = "received_vzla";

        const prev = f.logistics;
        const effectiveLeg = Math.max(leg, prev?.currentLeg || 1);

        return {
          ...f,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          logistics: {
            ...prev,
            currentLeg: effectiveLeg,
            weightLbs: prev?.weightLbs || 3.5,
            freightCostUSD: prev?.freightCostUSD || 20,
            trackingUS: patch.trackingUS !== undefined ? patch.trackingUS : prev?.trackingUS,
            trackingNumber: patch.trackingNumber !== undefined ? patch.trackingNumber : prev?.trackingNumber || "",
            carrierStatusText: patch.statusText || prev?.carrierStatusText || "En tránsito normal",
            statusNote: patch.statusText !== undefined ? patch.statusText : prev?.statusNote,
            arrivedMiamiDate: patch.arrivedMiamiDate || prev?.arrivedMiamiDate,
            arrivedVzlaDate: patch.arrivedVzlaDate || prev?.arrivedVzlaDate,
            warehouseLocationVzla: patch.warehouseLocationVzla || prev?.warehouseLocationVzla,
          },
          timeline: [
            ...f.timeline,
            {
              id: `TL-${Date.now()}`,
              timestamp: new Date().toISOString(),
              actor: "Usuario",
              title: `Actualización Tramo ${effectiveLeg}`,
              description: patch.statusText || `Avanzó al tramo ${effectiveLeg}.`,
              stage: "Logística",
            },
          ],
        };
      })
    );
  };

  const handleAddPartOrder = (flipId: string, part: Omit<PartOrder, "id">) => {
    setFlips(
      flips.map((f) => {
        if (f.id !== flipId) return f;
        const currentParts = f.repair?.partsList || [];
        const newPartObj: PartOrder = { ...part, id: `PART-${Date.now()}` };
        const updatedParts = [...currentParts, newPartObj];
        const totalCost = updatedParts.reduce((s, p) => s + p.costUSD, 0);

        return {
          ...f,
          updatedAt: new Date().toISOString(),
          repair: {
            assignedTechnician: f.repair?.assignedTechnician || "Taller Maracay",
            repairStatus: "in_progress",
            diagnosedDefects: f.repair?.diagnosedDefects || [],
            partsList: updatedParts,
            actualPartsCostUSD: totalCost,
            difficulty: f.repair?.difficulty || "Media",
          },
        };
      })
    );
  };

  const handleCompleteRepair = (flipId: string) => {
    setFlips(
      flips.map((f) => {
        if (f.id !== flipId) return f;
        return {
          ...f,
          status: "ready_for_sale",
          updatedAt: new Date().toISOString(),
          repair: f.repair ? { ...f.repair, repairStatus: "completed" } : undefined,
          inventory: {
            sku: `SKU-${f.id}`,
            conditionGrade: "A",
            physicalLocationTag: "Vitrina Mostrar Maracay",
            targetPriceUSD: f.analysis?.flipMath.estimatedMarketPriceVzlaUSD || 500,
            readyDate: new Date().toISOString().split("T")[0],
          },
          timeline: [
            ...f.timeline,
            {
              id: `TL-${Date.now()}`,
              timestamp: new Date().toISOString(),
              actor: "Técnico QA",
              title: "Aprobación de Control de Calidad",
              description: "Reparación completada y chequeo de puertos/pantalla 100% verificado.",
              stage: "Taller",
            },
          ],
        };
      })
    );
    setActiveModule("inventory");
  };

  const handlePublishForSale = (flipId: string) => {
    setFlips(
      flips.map((f) =>
        f.id === flipId
          ? {
              ...f,
              status: "listed",
              updatedAt: new Date().toISOString(),
              timeline: [
                ...f.timeline,
                {
                  id: `TL-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: "Ventas",
                  title: "Publicado en MercadoLibre / Instagram",
                  description: "Disponible para venta inmediata al público.",
                  stage: "Ventas",
                },
              ],
            }
          : f
      )
    );
    setActiveModule("sales");
  };

  const handleRecordSale = (flipId: string, saleData: SaleInfo) => {
    setFlips(
      flips.map((f) => {
        if (f.id !== flipId) return f;
        return {
          ...f,
          status: "sold",
          updatedAt: new Date().toISOString(),
          sale: saleData,
          timeline: [
            ...f.timeline,
            {
              id: `TL-${Date.now()}`,
              timestamp: new Date().toISOString(),
              actor: "Comercial",
              title: "Venta Cerrada & Cobrada",
              description: `Vendido a ${saleData.buyerName} en ${saleData.salePriceUSD} USD por ${saleData.channel}.`,
              stage: "Venta",
            },
          ],
        };
      })
    );

    // Record incoming transaction
    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      date: saleData.saleDate,
      type: "income",
      category: "Ingreso Venta",
      amountUSD: saleData.salePriceUSD,
      amountVES: saleData.salePriceVES,
      exchangeRate: saleData.exchangeRateUsed,
      currency: "USD",
      paymentMethod: saleData.paymentMethodUsed as any,
      notes: `Venta de ${flipId} a ${saleData.buyerName} via ${saleData.channel}`,
    };

    setTransactions([newTx, ...transactions]);

    // Update Client directory
    const existingClient = clients.find((c) => c.phone === saleData.buyerPhone);
    if (existingClient) {
      setClients(
        clients.map((c) =>
          c.id === existingClient.id
            ? {
                ...c,
                totalPurchasesCount: c.totalPurchasesCount + 1,
                totalSpentUSD: c.totalSpentUSD + saleData.salePriceUSD,
                lastPurchaseDate: saleData.saleDate,
              }
            : c
        )
      );
    } else {
      setClients([
        {
          id: `CLI-${Date.now()}`,
          name: saleData.buyerName,
          phone: saleData.buyerPhone,
          city: saleData.buyerCity,
          preferredChannel: saleData.channel,
          totalPurchasesCount: 1,
          totalSpentUSD: saleData.salePriceUSD,
          lastPurchaseDate: saleData.saleDate,
        },
        ...clients,
      ]);
    }
  };

  const handleAddPurchase = (flipId: string, purchaseData: any) => {
    setFlips(
      flips.map((f) =>
        f.id === flipId
          ? {
              ...f,
              status: "purchased",
              updatedAt: new Date().toISOString(),
              purchase: {
                priceUSD: purchaseData.priceUSD || 0,
                shippingUSUSD: purchaseData.shippingUSUSD || 0,
                taxUSD: 0,
                totalUSD: purchaseData.totalUSD || 0,
                purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split("T")[0],
                supplierName: purchaseData.supplierName || "eBay",
                trackingUS: purchaseData.trackingUS || "",
                paymentMethod: purchaseData.paymentMethod || "Zelle",
              },
              timeline: [
                ...f.timeline,
                {
                  id: `TL-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  actor: "Usuario",
                  title: "Compra Registrada Manualmente",
                  description: `Pagado ${purchaseData.totalUSD || 0} USD a ${purchaseData.supplierName || "proveedor"}.`,
                  stage: "Compra",
                },
              ],
            }
          : f
      )
    );
    setActiveModule("logistics");
  };

  const handleAddManualFlip = (newFlip: FlipItem) => {
    setFlips([newFlip, ...flips]);
    setActiveModule("logistics");
  };

  const handleAddDocument = (doc: Omit<DocumentFile, "id">) => {
    const newDoc: DocumentFile = { ...doc, id: `DOC-${Date.now()}` };
    setDocuments([newDoc, ...documents]);
  };

  const handleAddTransaction = (txData: Omit<Transaction, "id">) => {
    const newTx: Transaction = {
      ...txData,
      id: `TX-${Date.now()}`,
    };
    setTransactions([newTx, ...transactions]);
  };

  const badgeCounts = {
    opportunities: flips.filter((f) => f.status === "saved_opportunity" || f.status === "evaluating").length,
    purchases: flips.filter((f) => f.status === "purchased").length,
    logistics: flips.filter((f) =>
      ["in_transit_us", "miami_warehouse", "international_freight", "customs_vzla"].includes(f.status)
    ).length,
    repairs: flips.filter((f) => f.status === "in_repair" || f.status === "received_vzla").length,
    inventory: flips.filter((f) => f.status === "ready_for_sale").length,
    sales: flips.filter((f) => f.status === "listed").length,
  };

  // ── Si la ruta es la raíz (landing), mostramos la página de marketing ──
  if (route === "landing") {
    return <LandingPage onEnterApp={goToApp} />;
  }

  return (
    <div className="h-screen bg-[#dbdad7] text-[#121212] flex flex-col font-sans selection:bg-[#121212] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        settings={settings}
        onOpenAnalyzer={() => setActiveModule("analyzer")}
        onSelectModule={setActiveModule}
        inTransitCount={badgeCounts.logistics}
        inRepairCount={badgeCounts.repairs}
        listedCount={badgeCounts.sales}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentModule={activeModule}
          onSelectModule={setActiveModule}
          badgeCounts={badgeCounts}
        />

        {/* Dynamic Main Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {activeModule === "dashboard" && (
            <DashboardModule
              flips={flips}
              transactions={transactions}
              settings={settings}
              onOpenAnalyzer={() => setActiveModule("analyzer")}
              onSelectModule={setActiveModule}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
              onAddTransaction={handleAddTransaction}
              onAddFlip={(newFlip) => setFlips([newFlip, ...flips])}
              onRecordSale={handleRecordSale}
            />
          )}

          {activeModule === "analyzer" && (
            <AIAnalyzerModule
              settings={settings}
              onSaveOpportunity={handleSaveOpportunity}
              onConvertToFlip={handleConvertToFlip}
            />
          )}

          {activeModule === "opportunities" && (
            <OpportunitiesModule
              flips={flips}
              settings={settings}
              onConvertToFlip={handleConvertToFlip}
              onDeleteFlip={handleDeleteFlip}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
            />
          )}

          {activeModule === "purchases" && (
            <PurchasesModule
              flips={flips}
              onAddPurchase={handleAddPurchase}
              onAddManualFlip={handleAddManualFlip}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
            />
          )}

          {activeModule === "logistics" && (
            <LogisticsModule
              flips={flips}
              settings={settings}
              onUpdateLogisticsStatus={handleUpdateLogisticsStatus}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
            />
          )}

          {activeModule === "repairs" && (
            <RepairsModule
              flips={flips}
              onAddPartOrder={handleAddPartOrder}
              onCompleteRepair={handleCompleteRepair}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
            />
          )}

          {activeModule === "inventory" && (
            <InventoryModule
              flips={flips}
              settings={settings}
              onPublishForSale={handlePublishForSale}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
              onOpenAnalyzer={() => setActiveModule("analyzer")}
            />
          )}

          {activeModule === "sales" && (
            <SalesModule
              flips={flips}
              settings={settings}
              onRecordSale={handleRecordSale}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
            />
          )}

          {activeModule === "transactions" && (
            <TransactionsModule
              transactions={transactions}
              settings={settings}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeModule === "clients" && <ClientsModule clients={clients} />}

          {activeModule === "documents" && (
            <DocumentsInboxModule
              documents={documents}
              onAddDocument={handleAddDocument}
            />
          )}

          {activeModule === "audit" && <AuditHistoryModule flips={flips} />}

          {activeModule === "ebaysync" && (
            <EbaySyncModule
              flips={flips}
              setFlips={setFlips}
              settings={settings}
              onAnalyzeUrl={(url) => {
                setActiveModule("analyzer");
              }}
            />
          )}

          {activeModule === "calculators" && <CalculatorsModule settings={settings} />}

          {activeModule === "reports" && <ReportsModule flips={flips} settings={settings} />}

          {activeModule === "exports" && (
            <ExportsModule flips={flips} transactions={transactions} clients={clients} />
          )}

          {activeModule === "settings" && (
            <SettingsModule
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onRefreshExchangeRates={handleRefreshExchangeRates}
            />
          )}

          {activeModule === "tiendas" && (
            <TiendasModule
              flips={flips}
              setFlips={setFlips}
              settings={settings}
              onViewFlipDetails={(flip) => setSelectedFlipForModal(flip)}
            />
          )}
        </main>
      </div>

      {/* 360° Flip Detail Modal */}
      {selectedFlipForModal && (
        <FlipDetailModal
          flip={selectedFlipForModal}
          settings={settings}
          onClose={() => setSelectedFlipForModal(null)}
        />
      )}
    </div>
  );
};
