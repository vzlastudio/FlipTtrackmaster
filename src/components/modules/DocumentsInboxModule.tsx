import React, { useRef, useState } from "react";
import { DocumentFile } from "../../types";
import { FolderOpen, FileText, Download, Upload } from "lucide-react";
import { useToast } from "../Toast";

interface DocumentsInboxModuleProps {
  documents: DocumentFile[];
  onAddDocument: (doc: Omit<DocumentFile, "id">) => void;
}

const TIPOS: DocumentFile["type"][] = [
  "Factura Compra",
  "Guía Courier",
  "Foto Reparación",
  "Planilla Aduana",
  "Recibo Venta",
];

export const DocumentsInboxModule: React.FC<DocumentsInboxModuleProps> = ({ documents, onAddDocument }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const procesarArchivo = async (file: File, tipo: DocumentFile["type"]) => {
    setSubiendo(true);
    try {
      // Límite ~4MB para Data URL (IndexedDB)
      if (file.size > 4 * 1024 * 1024) {
        toast({
          type: "warning",
          title: "Archivo demasiado grande",
          message: "Máximo 4MB por archivo (límite de IndexedDB). Sube una versión comprimida.",
        });
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      onAddDocument({
        title: file.name.replace(/\.[^.]+$/, ""),
        type: tipo,
        fileUrl: dataUrl,
        uploadDate: new Date().toISOString().split("T")[0],
        sizeKb: Math.round(file.size / 1024),
      });
      toast({ type: "success", title: "Documento guardado", message: `${file.name} quedó en el Inbox Documental.` });
    } catch (err: any) {
      toast({ type: "error", title: "No se pudo subir", message: err?.message || "Error leyendo el archivo." });
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file, "Factura Compra");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#616161] font-medium text-[10px] uppercase tracking-wider">
            <FolderOpen className="w-3.5 h-3.5 text-[#121212]" />
            <span>Repositorio Central de Facturas, Guías & Planillas de Aduana</span>
          </div>
          <h2 className="text-2xl font-serif font-normal text-[#121212] mt-1">Inbox Documental ({documents.length})</h2>
          <p className="text-xs text-[#616161] mt-1 max-w-2xl font-sans">
            Almacenamiento local (IndexedDB) de recibos Zelle, facturas eBay, guías de despacho Liberty Express y fotos de reparación en taller.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
          dragOver ? "border-[#121212] bg-[#dbdad7]/40" : "border-[#e6e4e0] bg-white"
        }`}
      >
        <Upload className="w-8 h-8 text-[#616161] mx-auto mb-2" />
        <p className="text-xs text-[#121212] font-medium">
          Arrastra un archivo aquí o{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="underline underline-offset-2 hover:text-[#121212] font-semibold"
          >
            selecciona uno
          </button>
        </p>
        <p className="text-[10px] text-[#616161] mt-1">PDF, JPG, PNG · máx 4MB (se guarda localmente en tu navegador)</p>
        <div className="flex justify-center gap-2 mt-3">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              disabled={subiendo}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "application/pdf,image/*,.pdf,.jpg,.jpeg,.png";
                input.onchange = () => {
                  const f = input.files?.[0];
                  if (f) procesarArchivo(f, t);
                };
                input.click();
              }}
              className="bg-[#e6e4e0] hover:bg-[#d8d6d2] disabled:opacity-40 text-[#121212] font-medium text-[11px] px-3 py-1.5 rounded-full transition"
            >
              {t}
            </button>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) procesarArchivo(f, "Factura Compra");
          }}
        />
      </div>

      {/* Empty state */}
      {documents.length === 0 ? (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-12 text-center">
          <FileText className="w-10 h-10 text-[#616161] mx-auto mb-3" />
          <h3 className="text-base font-serif font-normal text-[#121212]">No hay documentos subidos</h3>
          <p className="text-xs text-[#616161] mt-1 font-sans">Sube facturas de compra, guías de courier y fotos de reparación para tener todo auditable.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e6e4e0] rounded-lg p-6 shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#121212]">
              <thead className="bg-[#dbdad7]/30 text-[#616161] font-medium uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-lg">Documento / Archivo</th>
                  <th className="p-3">Tipo Documento</th>
                  <th className="p-3">Flip Asociado</th>
                  <th className="p-3">Fecha Subida</th>
                  <th className="p-3 text-right rounded-r-lg">Descarga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e4e0]">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#dbdad7]/20 transition">
                    <td className="p-3 font-serif text-sm font-normal text-[#121212] flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#121212] shrink-0" />
                      <span>{doc.title}</span>
                    </td>

                    <td className="p-3">
                      <span className="bg-[#e6e4e0] px-2 py-0.5 rounded-full text-[10px] font-medium text-[#121212]">
                        {doc.type}
                      </span>
                    </td>

                    <td className="p-3 text-[#121212] font-medium">{doc.flipTitle || "General"}</td>
                    <td className="p-3 font-mono text-[#616161] text-[11px]">{doc.uploadDate}</td>

                    <td className="p-3 text-right">
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          download={doc.title}
                          className="text-[#121212] hover:underline font-medium text-xs flex items-center space-x-1 ml-auto justify-end"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{doc.sizeKb} KB</span>
                        </a>
                      ) : (
                        <span className="text-[#616161] text-[11px] flex items-center space-x-1 ml-auto">
                          <Download className="w-3.5 h-3.5" />
                          <span>{doc.sizeKb} KB</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
