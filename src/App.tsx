import { useState, useRef, useCallback } from 'react';
import {
  FileSearch,
  Loader2,
  AlertCircle,
  Upload,
  ListChecks,
  Settings2,
} from 'lucide-react';
import DropZone from '@/components/DropZone';
import Results, { type ResultData } from '@/components/Results';
import { PADRONES } from '@/config/padrones';
import { parseCuitList, formatCuit } from '@/utils/cuit';
import { generateExcel, downloadBlob } from '@/utils/excel';

type Jurisdiction = 'ARBA' | 'AGIP';

interface ProgressData {
  current: number;
  total: number;
}

export default function App() {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('ARBA');
  const [file, setFile] = useState<File | null>(null);
  const [cuitText, setCuitText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicatesInfo, setDuplicatesInfo] = useState<string[]>([]);
  const [invalidInfo, setInvalidInfo] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  const handleFileSelect = useCallback((f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.zip') && !name.endsWith('.txt')) {
      setError('Formato no soportado. Solo se aceptan archivos .zip o .txt');
      return;
    }
    setError(null);
    setFile(f);
    setResult(null);
  }, []);

  const handleFileRemove = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

  const handleCuitFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCuitText(reader.result as string);
    };
    reader.readAsText(f);
    setError(null);
  }, []);

  const handleProcess = useCallback(() => {
    if (!file) {
      setError('Tenés que cargar un archivo de padrón.');
      return;
    }

    const { cuits, duplicates, invalid } = parseCuitList(cuitText);
    setDuplicatesInfo(duplicates);
    setInvalidInfo(invalid);

    if (cuits.length === 0) {
      setError('No hay CUIT válidos en la lista. Ingresá al menos un CUIT de 11 dígitos.');
      return;
    }

    setError(null);
    setResult(null);
    setProcessing(true);
    setProgress({ current: 0, total: file.size });

    const worker = new Worker(new URL('./workers/processWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setProgress({ current: msg.current, total: msg.total });
      } else if (msg.type === 'done') {
        setProcessing(false);
        setProgress(null);
        setResult({
          found: msg.found,
          notFound: msg.notFound,
          duplicates: msg.duplicates,
          stats: msg.stats,
        });
        worker.terminate();
      } else if (msg.type === 'error') {
        setProcessing(false);
        setProgress(null);
        setError(msg.message);
        worker.terminate();
      }
    };

    worker.onerror = () => {
      setProcessing(false);
      setProgress(null);
      setError('Ocurrió un error inesperado al procesar el archivo.');
      worker.terminate();
    };

    worker.postMessage({
      file,
      jurisdiction,
      cuitList: cuits,
    });
  }, [file, cuitText, jurisdiction]);

  const handleDownload = useCallback(async () => {
    if (!result || !file) return;
    setDownloading(true);
    try {
      const padron = PADRONES[jurisdiction];
      const rows = [
        ...result.found.map((r) => ({ cuit: r.cuit, found: true, fields: r.fields })),
        ...result.notFound.map((c) => ({ cuit: c, found: false, fields: [] as string[] })),
      ];
      const blob = await generateExcel(padron, rows, file.name);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      downloadBlob(blob, `Cruce_${baseName}.xlsx`);
    } catch {
      setError('Error al generar el archivo Excel.');
    } finally {
      setDownloading(false);
    }
  }, [result, file, jurisdiction]);

  const progressPercent = progress
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  const padronConfig = PADRONES[jurisdiction];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-bordo-50/30">
      {/* Header */}
      <header className="bg-bordo-700 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-2">
            <FileSearch size={36} className="flex-shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Búsqueda de CUIT en Padrones
            </h1>
          </div>
          <p className="text-bordo-100 text-sm sm:text-base ml-11">
            Cruzá padrones de ARBA y AGIP con tu lista de CUIT y descargá el resultado en Excel
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Step 1: Jurisdiction */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-bordo-700 text-white text-sm font-bold">1</span>
              <h2 className="text-lg font-semibold text-gray-800">Jurisdicción</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {(Object.keys(PADRONES) as Jurisdiction[]).map((key) => {
                const config = PADRONES[key];
                const selected = jurisdiction === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setJurisdiction(key);
                      setResult(null);
                    }}
                    disabled={processing}
                    className={`
                      relative p-4 rounded-xl border-2 text-left transition-all
                      ${selected
                        ? 'border-bordo-700 bg-bordo-50 shadow-sm'
                        : 'border-gray-200 hover:border-bordo-300 bg-white'
                      }
                      ${processing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                        ${selected ? 'border-bordo-700' : 'border-gray-300'}`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-bordo-700" />}
                      </span>
                      <span className={`font-bold ${selected ? 'text-bordo-800' : 'text-gray-700'}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">{config.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
              <Settings2 size={14} />
              <span>{padronConfig.expectedFieldCount} campos por registro</span>
            </div>
          </section>

          {/* Step 2: File upload */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-bordo-700 text-white text-sm font-bold">2</span>
              <h2 className="text-lg font-semibold text-gray-800">Padrón</h2>
            </div>
            <DropZone
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              disabled={processing}
            />
          </section>

          {/* Step 3: CUIT list */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-bordo-700 text-white text-sm font-bold">3</span>
              <h2 className="text-lg font-semibold text-gray-800">Lista de CUIT</h2>
            </div>
            <div className="space-y-3">
              <textarea
                value={cuitText}
                onChange={(e) => {
                  setCuitText(e.target.value);
                  setResult(null);
                }}
                disabled={processing}
                rows={6}
                placeholder="Pegá los CUIT acá (uno por línea, o separados por coma, espacio o punto y coma)&#10;Ejemplo:&#10;30-50001011-2&#10;30700001012, 30-700001013-3; ..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono text-gray-700
                  focus:ring-2 focus:ring-bordo-500 focus:border-bordo-500 outline-none transition-colors
                  resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">o</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200
                text-sm font-medium text-gray-600 hover:border-bordo-300 hover:bg-bordo-50/50 transition-colors
                cursor-pointer w-full">
                <Upload size={16} />
                Subir .txt o .csv con la lista
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  disabled={processing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCuitFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {/* Duplicate / invalid info */}
            {(duplicatesInfo.length > 0 || invalidInfo.length > 0) && cuitText && (
              <div className="mt-4 space-y-2">
                {duplicatesInfo.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    <ListChecks size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      {duplicatesInfo.length} CUIT duplicado{duplicatesInfo.length > 1 ? 's' : ''} en tu lista (se ignoran):{' '}
                      {duplicatesInfo.slice(0, 5).map(formatCuit).join(', ')}
                      {duplicatesInfo.length > 5 && ` y ${duplicatesInfo.length - 5} más`}
                    </span>
                  </div>
                )}
                {invalidInfo.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      {invalidInfo.length} CUIT inválido{invalidInfo.length > 1 ? 's' : ''} (no tienen 11 dígitos):{' '}
                      {invalidInfo.slice(0, 5).join(', ')}
                      {invalidInfo.length > 5 && ` y ${invalidInfo.length - 5} más`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Process button */}
          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              disabled={processing}
              className={`
                flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-white text-base
                transition-all shadow-md
                ${processing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-bordo-700 hover:bg-bordo-800 active:scale-95 hover:shadow-lg'
                }
              `}
            >
              {processing ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <FileSearch size={22} />
                  Procesar
                </>
              )}
            </button>
          </div>

          {/* Progress bar */}
          {processing && progress && (
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Procesando padrón...</span>
                <span className="font-mono font-semibold">{progressPercent}%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-bordo-700 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {result && file && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <Results
                data={result}
                padronBaseName={file.name.replace(/\.[^.]+$/, '')}
                onDownload={handleDownload}
                downloading={downloading}
              />
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-gray-400 pb-6">
          <p>Todo el procesamiento ocurre en tu navegador. No se guarda ni envía ningún dato.</p>
        </footer>
      </main>
    </div>
  );
}
