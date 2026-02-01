export interface Hoop {
    id: string;
    name: string;
    width: number; // mm
    height: number; // mm
    shape: 'rect' | 'oval';
    brand?: 'singer' | 'brother' | 'janome' | 'universal';
}

export const HOOP_PRESETS: Hoop[] = [
    // Singer
    { id: 'singer-s', name: 'Singer Small (100x100)', width: 100, height: 100, shape: 'rect', brand: 'singer' },
    { id: 'singer-m', name: 'Singer Medium (170x100)', width: 170, height: 100, shape: 'oval', brand: 'singer' },
    { id: 'singer-l', name: 'Singer Large (260x160)', width: 260, height: 160, shape: 'rect', brand: 'singer' },

    // Brother
    { id: 'brother-4x4', name: 'Brother 4x4 (100x100)', width: 100, height: 100, shape: 'rect', brand: 'brother' },
    { id: 'brother-5x7', name: 'Brother 5x7 (180x130)', width: 180, height: 130, shape: 'rect', brand: 'brother' },

    // Universal
    { id: 'uni-120', name: 'Universal 120x120', width: 120, height: 120, shape: 'rect', brand: 'universal' },
    { id: 'uni-200', name: 'Universal 200x200', width: 200, height: 200, shape: 'rect', brand: 'universal' },
];
