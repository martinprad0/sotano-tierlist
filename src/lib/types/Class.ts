// PATH: src/lib/types/Class.ts

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'NONE';
export type Category = 'algebra' | 'geometry' | 'applied' | 'analysis' | 'logic' | null;

export const CATEGORY_LABELS: Record<string, string> = {
  algebra: 'Álgebra',
  geometry: 'Geometría',
  applied: 'Matemáticas Aplicadas',
  analysis: 'Análisis',
  logic: 'Lógica'
};

export const CATEGORY_COLORS: Record<string, string> = {
  algebra: '#8B1A1A',   // dark red
  geometry: '#8B7A00',  // dark yellow
  applied: '#1A5C1A',   // dark green
  analysis: '#1A3A8B',  // dark blue
  logic: '#4A1A8B'      // dark purple
};

export const CATEGORY_COLORS_LIGHT: Record<string, string> = {
  algebra: '#ff7f7f',
  geometry: '#ffdf7f',
  applied: '#aeff7f',
  analysis: '#7faeff',
  logic: '#bf7fff'
};

export interface UniClass {
  id: string;
  name: string;
  abbr: string;
  tier: Tier;
  category: Category;
  updatedAt: string;
}