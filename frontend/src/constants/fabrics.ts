import { StitchSettings } from '@/types/embroidery';

export interface FabricPreset {
    id: string;
    label: string;
    description: string;
    settings: Partial<StitchSettings>;
}

export const FABRIC_PRESETS: FabricPreset[] = [
    {
        id: 'cotton',
        label: 'Cotton (Standard)',
        description: 'Standard woven cotton. Balanced settings.',
        settings: {
            density: 4.0, // 0.4mm spacing (standard)
            pullCompensation: 0.2, // Some stretch
            stitchLength: 3.5,
            underlay: true
        }
    },
    {
        id: 'denim',
        label: 'Denim / Canvas',
        description: 'Thick, stable fabrics. Higher density allowed.',
        settings: {
            density: 3.5, // 0.35mm spacing (tighter)
            pullCompensation: 0.1, // Less pull comp needed
            stitchLength: 3.5,
            underlay: true
        }
    },
    {
        id: 'silk',
        label: 'Silk / Satin',
        description: 'Delicate, slippery fabrics. Low density to avoid puckering.',
        settings: {
            density: 5.0, // 0.5mm spacing (looser)
            pullCompensation: 0.4, // High pull comp
            stitchLength: 3.0,
            underlay: true
        }
    },
    {
        id: 'jersey',
        label: 'Jersey / Knit',
        description: 'Stretchy fabrics. Needs high compensation and underlay.',
        settings: {
            density: 4.5,
            pullCompensation: 0.5, // Very high pull comp
            stitchLength: 3.0, // Shorter stitches to move with fabric
            underlay: true
        }
    },
    {
        id: 'towel',
        label: 'Terry Cloth / Towel',
        description: 'High pile. Needs topping and heavy underlay.',
        settings: {
            density: 4.0,
            pullCompensation: 0.3,
            stitchLength: 4.0, // Longer to float over pile
            underlay: true
        }
    }
];
