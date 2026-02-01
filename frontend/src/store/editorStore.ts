import { create } from 'zustand';
import { Layer, ToolType } from '@/types/embroidery';

interface EditorState {
    layers: Layer[];
    selectedLayerId: string | null;
    activeTool: ToolType;
    selectedHoopId: string;
    selectHoop: (id: string) => void;
    setLayers: (layers: Layer[]) => void;
    toggleLayerVisibility: (id: string) => void;
    toggleLayerLock: (id: string) => void;
    selectLayer: (id: string) => void;
    reorderLayers: (oldIndex: number, newIndex: number) => void;
    setTool: (tool: ToolType) => void;
    updateLayerStitchCount: (id: string, count: number) => void;
    updateLayerSettings: (id: string, settings: any) => void;

    // Transform / Properties
    activeTransform: any | null; // { x, y, width, height, rotation, scaleX, scaleY }
    setActiveTransform: (transform: any | null) => void;

    // Mechanism to push changes from UI to Canvas
    pendingTransformChange: { key: string, value: number } | null;
    requestTransformChange: (key: string, value: number) => void;
    clearPendingTransformChange: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    layers: [],
    selectedLayerId: null,
    activeTool: 'select',
    selectedHoopId: 'singer-s', // Default
    activeTransform: null,
    pendingTransformChange: null,

    setActiveTransform: (transform) => set({ activeTransform: transform }),
    requestTransformChange: (key, value) => set({ pendingTransformChange: { key, value } }),
    clearPendingTransformChange: () => set({ pendingTransformChange: null }),

    selectHoop: (id) => set({ selectedHoopId: id }),
    setLayers: (layers) => set({ layers }),
    toggleLayerVisibility: (id) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, visible: !l.visible } : l
            ),
        })),
    toggleLayerLock: (id) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, locked: !l.locked } : l
            ),
        })),
    selectLayer: (id) => set({ selectedLayerId: id }),
    reorderLayers: (oldIndex, newIndex) =>
        set((state) => {
            const newLayers = [...state.layers];
            const [moved] = newLayers.splice(oldIndex, 1);
            newLayers.splice(newIndex, 0, moved);
            return { layers: newLayers };
        }),
    setTool: (tool) => set({ activeTool: tool }),
    updateLayerStitchCount: (id, count) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, stitchCount: count } : l
            ),
        })),
    updateLayerSettings: (id, settings) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, settings: { ...l.settings, ...settings } } : l
            ),
        })),
}));
