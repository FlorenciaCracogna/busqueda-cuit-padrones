import { useRef, useState, useCallback } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface DropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled: boolean;
}

export default function DropZone({ file, onFileSelect, onFileRemove, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) {
        onFileSelect(dropped);
      }
    },
    [disabled, onFileSelect]
  );

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const accept = '.zip,.txt';

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Carga del padrón
      </label>
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${dragOver ? 'border-bordo-600 bg-bordo-50 scale-[1.01]' : 'border-gray-300 hover:border-bordo-400 hover:bg-bordo-50/50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileSelect(f);
              e.target.value = '';
            }}
          />
          <UploadCloud
            className={`mx-auto mb-3 transition-colors ${dragOver ? 'text-bordo-600' : 'text-gray-400'}`}
            size={40}
          />
          <p className="text-sm text-gray-600 font-medium">
            Arrastrá tu archivo aquí o hacé clic para seleccionar
          </p>
          <p className="text-xs text-gray-400 mt-1">Formatos soportados: .zip, .txt</p>
        </div>
      ) : (
        <div className="border-2 border-solid border-bordo-200 rounded-xl p-4 bg-bordo-50/50 flex items-center gap-3">
          <FileText className="text-bordo-600 flex-shrink-0" size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={onFileRemove}
            disabled={disabled}
            className="p-1.5 rounded-lg text-gray-400 hover:text-bordo-600 hover:bg-bordo-100 transition-colors disabled:opacity-50"
            aria-label="Quitar archivo"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
