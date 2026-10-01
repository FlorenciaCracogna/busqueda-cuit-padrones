export type FieldFormat = 'text' | 'number' | 'integer' | 'aliquota' | 'date';

export interface PadronField {
  name: string;
  format: FieldFormat;
}

export interface PadronConfig {
  id: 'ARBA' | 'AGIP';
  label: string;
  description: string;
  expectedFieldCount: number;
  cuitFieldIndex: number;
  fields: PadronField[];
}

export const PADRONES: Record<'ARBA' | 'AGIP', PadronConfig> = {
  ARBA: {
    id: 'ARBA',
    label: 'ARBA',
    description: 'Padrón de Retenciones y Percepciones ARBA (Provincia de Buenos Aires)',
    expectedFieldCount: 10,
    cuitFieldIndex: 4,
    fields: [
      { name: 'Régimen', format: 'text' },
      { name: 'Fecha Publicación', format: 'date' },
      { name: 'Vigencia Desde', format: 'date' },
      { name: 'Vigencia Hasta', format: 'date' },
      { name: 'CUIT', format: 'text' },
      { name: 'Tipo Contribuyente', format: 'text' },
      { name: 'Marca Alta Sujeto', format: 'text' },
      { name: 'Marca Cambio Alícuota', format: 'text' },
      { name: 'Alícuota', format: 'aliquota' },
      { name: 'Nro. Grupo', format: 'text' },
    ],
  },
  AGIP: {
    id: 'AGIP',
    label: 'AGIP',
    description: 'Padrón de Retenciones y Percepciones AGIP (CABA)',
    expectedFieldCount: 12,
    cuitFieldIndex: 3,
    fields: [
      { name: 'Fecha Publicación', format: 'date' },
      { name: 'Vigencia Desde', format: 'date' },
      { name: 'Vigencia Hasta', format: 'date' },
      { name: 'CUIT', format: 'text' },
      { name: 'Tipo Contribuyente', format: 'text' },
      { name: 'Marca Alta Sujeto', format: 'text' },
      { name: 'Marca Cambio Alícuota', format: 'text' },
      { name: 'Alícuota Percepción', format: 'aliquota' },
      { name: 'Alícuota Retención', format: 'aliquota' },
      { name: 'Nro. Grupo Percepción', format: 'text' },
      { name: 'Nro. Grupo Retención', format: 'text' },
      { name: 'Razón Social', format: 'text' },
    ],
  },
};

export function getPadron(id: 'ARBA' | 'AGIP'): PadronConfig {
  return PADRONES[id];
}
