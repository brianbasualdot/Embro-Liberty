export type ToolType = 'select' | 'node_edit' | 'pen' | 'rectangle' | 'circle' | 'knife';

density: number; // Stitches per mm
pullCompensation: number; // mm
underlay: boolean;
angle: number; // degrees
stitchLength ?: number; // max stitch length mm
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    color: string; // Hex code
    stitchCount?: number;
    threadLength?: number; // meters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paths: any[]; // Fabric object data or coordinates
    settings?: StitchSettings;
}

export interface EmbroideryProject {
    id: string;
    name: string;
    layers: Layer[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvasState: any; // JSON representation of Fabric canvas
    createdAt: string;
    updatedAt: string;
    userId: string;
}
