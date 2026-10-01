import { Download, CheckCircle2, XCircle, AlertTriangle, Search } from 'lucide-react';
import { formatCuit } from '@/utils/cuit';

export interface ResultData {
  found: { cuit: string; fields: string[] }[];
  notFound: string[];
  duplicates: string[];
  stats: {
    totalCuits: number;
    foundCount: number;
    notFoundCount: number;
    duplicateCount: number;
    validLines: number;
    shortLines: number;
  };
}

interface ResultsProps {
  data: ResultData;
  padronBaseName: string;
  onDownload: () => void;
  downloading: boolean;
}

export default function Results({ data, padronBaseName, onDownload, downloading }: ResultsProps) {
  const { stats, notFound, duplicates } = data;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-r from-bordo-50 to-white border border-bordo-100">
        <div className="flex-shrink-0">
          <CheckCircle2 className="text-bordo-600" size={32} />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-gray-800">
            Procesados {stats.foundCount} de {stats.totalCuits} CUIT
            {stats.notFoundCount > 0 && (
              <span className="text-bordo-700"> — {stats.notFoundCount} no encontrado{stats.notFoundCount > 1 ? 's' : ''}</span>
            )}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.validLines.toLocaleString()} líneas válidas en el padrón
            {stats.shortLines > 0 && ` · ${stats.shortLines.toLocaleString()} líneas ignoradas`}
          </p>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-bordo-700 text-white font-semibold text-sm
            hover:bg-bordo-800 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed
            shadow-sm whitespace-nowrap"
        >
          <Download size={18} />
          {downloading ? 'Generando...' : 'Descargar Excel'}
        </button>
      </div>

      {/* Duplicate warnings */}
      {duplicates.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              CUIT con múltiples apariciones en el padrón ({duplicates.length})
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Se tomó la primera aparición de cada uno:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {duplicates.slice(0, 20).map((c) => (
                <span key={c} className="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {formatCuit(c)}
                </span>
              ))}
              {duplicates.length > 20 && (
                <span className="text-xs text-amber-600 px-2 py-0.5">
                  y {duplicates.length - 20} más...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Not found list */}
      {notFound.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <XCircle className="text-bordo-600" size={20} />
            <h4 className="text-sm font-semibold text-gray-700">
              CUIT no encontrado{notFound.length > 1 ? 's' : ''} ({notFound.length})
            </h4>
          </div>
          <div className="max-h-60 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {notFound.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-1.5 text-sm font-mono text-gray-600 px-2.5 py-1.5 rounded bg-gray-50 border border-gray-100"
                >
                  <Search className="text-gray-300 flex-shrink-0" size={14} />
                  {formatCuit(c)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {notFound.length === 0 && stats.notFoundCount === 0 && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-sm font-medium text-green-800">
            Todos los CUIT fueron encontrados en el padrón.
          </p>
        </div>
      )}
    </div>
  );
}
