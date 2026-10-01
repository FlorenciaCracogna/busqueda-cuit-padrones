/// <reference lib="webworker" />

import { unzipSync } from 'fflate';

interface ProcessMessage {
  file: File;
  jurisdiction: 'ARBA' | 'AGIP';
  cuitList: string[];
}

self.onmessage = async (e: MessageEvent<ProcessMessage>) => {
  const { file, jurisdiction, cuitList } = e.data;

  const FIELD_COUNT = jurisdiction === 'ARBA' ? 10 : 12;
  const CUIT_INDEX = jurisdiction === 'ARBA' ? 4 : 3;

  const cuitSet = new Set(cuitList);
  const foundMap = new Map<string, string[]>();
  const duplicateWarnings: string[] = [];

  let validLines = 0;
  let shortLines = 0;
  let processedLines = 0;

  try {
    const isZip = file.name.toLowerCase().endsWith('.zip');

    const lineProcessor = (line: string) => {
      processedLines++;

      if (line.trim() === '') return;

      const fields = line.split(';');

      if (fields.length < FIELD_COUNT) {
        shortLines++;
        return;
      }

      validLines++;
      const cuitRaw = fields[CUIT_INDEX]?.trim() || '';
      const cuit = cuitRaw.replace(/[-.\s]/g, '');

      if (cuitSet.has(cuit)) {
        if (foundMap.has(cuit)) {
          if (!duplicateWarnings.includes(cuit)) {
            duplicateWarnings.push(cuit);
          }
        } else {
          foundMap.set(cuit, fields.slice(0, FIELD_COUNT));
        }
      }
    };

    if (isZip) {
      const buffer = await file.arrayBuffer();
      const u8 = new Uint8Array(buffer);
      const files = unzipSync(u8, {
        filter: (f) => f.name.toLowerCase().endsWith('.txt'),
      });

      const txtNames = Object.keys(files).sort();
      if (txtNames.length === 0) {
        self.postMessage({
          type: 'error',
          message: 'El ZIP no contiene ningún archivo .txt válido.',
        });
        return;
      }

      const decompressed = files[txtNames[0]];
      processBytesLineByLine(decompressed, lineProcessor, (current, total) => {
        self.postMessage({ type: 'progress', current, total });
      });
    } else {
      // Stream the text file
      const totalSize = file.size;
      let processedBytes = 0;
      const reader = file.stream().getReader();
      const decoder = new TextDecoder('latin1');
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        processedBytes += value.byteLength;
        lineBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = lineBuffer.indexOf('\n')) >= 0) {
          const line = lineBuffer.substring(0, idx);
          lineBuffer = lineBuffer.substring(idx + 1);
          lineProcessor(line);
        }

        if (processedBytes % 524288 < 65536) {
          self.postMessage({
            type: 'progress',
            current: processedBytes,
            total: totalSize,
          });
        }
      }

      // Flush decoder
      lineBuffer += decoder.decode();
      if (lineBuffer.length > 0) {
        lineProcessor(lineBuffer);
      }

      self.postMessage({
        type: 'progress',
        current: totalSize,
        total: totalSize,
      });
    }

    // Validate file matches expected design
    if (validLines > 0 && shortLines > validLines * 2) {
      self.postMessage({
        type: 'error',
        message: `El archivo no coincide con el diseño de ${jurisdiction}. La mayoría de las líneas no tienen los ${FIELD_COUNT} campos esperados.`,
      });
      return;
    }

    if (validLines === 0) {
      self.postMessage({
        type: 'error',
        message: 'El archivo no contiene líneas válidas con el formato esperado.',
      });
      return;
    }

    // Build results in input CUIT order
    const found: { cuit: string; fields: string[] }[] = [];
    const notFound: string[] = [];

    for (const cuit of cuitList) {
      const fields = foundMap.get(cuit);
      if (fields) {
        found.push({ cuit, fields });
      } else {
        notFound.push(cuit);
      }
    }

    self.postMessage({
      type: 'done',
      found,
      notFound,
      duplicates: duplicateWarnings,
      stats: {
        totalCuits: cuitList.length,
        foundCount: found.length,
        notFoundCount: notFound.length,
        duplicateCount: duplicateWarnings.length,
        validLines,
        shortLines,
      },
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: `Error al procesar el archivo: ${err instanceof Error ? err.message : 'desconocido'}`,
    });
  }
};

function processBytesLineByLine(
  bytes: Uint8Array,
  processLine: (line: string) => void,
  onProgress: (current: number, total: number) => void
) {
  const decoder = new TextDecoder('latin1');
  const total = bytes.length;
  let start = 0;
  const chunkSize = 65536;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) {
      // newline
      const slice = bytes.subarray(start, i);
      const line = decoder.decode(slice);
      processLine(line);
      start = i + 1;

      if (i % 524288 < chunkSize) {
        onProgress(i, total);
      }
    }
  }

  // Remaining
  if (start < bytes.length) {
    const slice = bytes.subarray(start);
    const line = decoder.decode(slice);
    processLine(line);
  }

  onProgress(total, total);
}

export {};
