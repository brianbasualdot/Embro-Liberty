"use client";

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { FABRIC_PRESETS } from '@/constants/fabrics';
import { Sliders, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';

import { StitchSettings } from '@/types/embroidery';

export default function FabricSettings() {
    const { selectedLayerId, layers, setLayers } = useEditorStore();
    const [advancedMode, setAdvancedMode] = useState(false);

    const selectedLayer = layers.find(l => l.id === selectedLayerId);

    // Local state for sliders to perform smoothly, synced with store
    const [settings, setSettings] = useState<Partial<StitchSettings>>(selectedLayer?.settings || {});
    const [selectedPreset, setSelectedPreset] = useState<string>('custom');

    // Sync when layer changes
    useEffect(() => {
        if (selectedLayer?.settings) {
            setSettings(selectedLayer.settings);
            // Try to match preset? simplified: just keep custom if switched manually
        }
    }, [selectedLayerId, selectedLayer?.settings]);

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = FABRIC_PRESETS.find(p => p.id === presetId);
        if (preset && selectedLayerId) {
            const newSettings = { ...settings, ...preset.settings };
            setSettings(newSettings);

            // Update Store
            useEditorStore.getState().updateLayerSettings(selectedLayerId, newSettings);
        }
    };

    const handleSettingChange = (key: string, value: number) => {
        if (!selectedLayerId) return;

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        useEditorStore.getState().updateLayerSettings(selectedLayerId, newSettings);

        setSelectedPreset('custom'); // Switch to custom if modified manually
    };

    // Transform Handlers
    const { activeTransform, requestTransformChange } = useEditorStore();

    // State for async operations
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAppliqueGen = async () => {
        if (!selectedLayerId || !selectedLayer || !selectedLayer.paths || selectedLayer.paths.length === 0) return;

        setIsGenerating(true);
        try {
            const polyPoints = selectedLayer.paths[0].map((p: any) => ({ x: p[0], y: p[1] }));

            const { stitchService } = await import('@/services/stitchService');
            const steps = await stitchService.generateApplique(polyPoints);

            const newLayers = steps.map((step, idx) => ({
                id: `${selectedLayerId}-app-${idx}`,
                name: step.name,
                color: step.color,
                visible: true,
                locked: false,
                paths: step.paths,
                settings: {
                    density: step.type === 'satin' ? 0.4 : 4.0,
                    pullCompensation: 0,
                    underlay: false,
                    angle: 0,
                    stitchType: step.type as any
                }
            }));

            const allLayers = [...layers, ...newLayers];
            setLayers(allLayers);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTransformChange = (key: string, val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            requestTransformChange(key, num);
        }
    };

    if (!selectedLayer) {
        // ... (return null or empty state, unchanged)
        return (
            <div className="p-4 space-y-6">
                <div className="text-center p-4 bg-gray-50 rounded border border-gray-100 mb-4">
                    <p className="text-sm text-gray-500">Ninguna capa seleccionada</p>
                    <p className="text-xs text-gray-400 mt-1">Selecciona una capa para configurar puntadas.</p>
                </div>

                {/* Project / Hoop Settings Fallback */}
                <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-3">Configuración del Proyecto</h3>
                    <div className="space-y-3">
                        <label className="block text-xs font-medium text-gray-700">Bastidor de Máquina</label>
                        <div className="p-3 bg-white border border-gray-200 rounded text-xs text-gray-600">
                            Usa la barra superior para cambiar el tamaño del bastidor.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 bg-white border-l border-[#e5e5e5] h-full w-80 overflow-y-auto">

            {/* GENERATIVE TOOLS */}
            <div className="space-y-3 pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                    Herramientas Inteligentes
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    <button
                        onClick={handleAppliqueGen}
                        disabled={isGenerating}
                        className="w-full py-2 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isGenerating ? 'Generando...' : '✨ Crear Appliqué Automático'}
                    </button>
                    {/* Placeholder for Auto-Satin */}
                    <button
                        className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-50"
                    >
                        Convertir a Satín (Beta)
                    </button>
                </div>
            </div>

            {/* TRANSFORM CONTROLS */}
            <div className="space-y-3 pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                    Transformación
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium">Posición X (mm)</label>
                        <input
                            type="number"
                            className="w-full p-1.5 text-xs border border-gray-200 rounded"
                            value={activeTransform?.x || 0}
                            onChange={(e) => handleTransformChange('x', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium">Posición Y (mm)</label>
                        <input
                            type="number"
                            className="w-full p-1.5 text-xs border border-gray-200 rounded"
                            value={activeTransform?.y || 0}
                            onChange={(e) => handleTransformChange('y', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium">Ancho (mm)</label>
                        <input
                            type="number"
                            className="w-full p-1.5 text-xs border border-gray-200 rounded"
                            value={activeTransform?.width || 0}
                            onChange={(e) => handleTransformChange('width', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium">Alto (mm)</label>
                        <input
                            type="number"
                            className="w-full p-1.5 text-xs border border-gray-200 rounded"
                            value={activeTransform?.height || 0}
                            onChange={(e) => handleTransformChange('height', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] text-gray-500 font-medium">Rotación (°)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range" min="0" max="360"
                                className="flex-1"
                                value={activeTransform?.rotation || 0}
                                onChange={(e) => handleTransformChange('rotation', e.target.value)}
                            />
                            <span className="text-xs w-8 text-right">{Math.round(activeTransform?.rotation || 0)}°</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* STITCH TYPE SELECTOR */}
            <div className="space-y-2 pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                    Tipo de Puntada
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {['satin', 'tatami', 'run'].map((type) => (
                        <button
                            key={type}
                            onClick={() => handleSettingChange('stitchType', type)}
                            className={clsx(
                                "py-2 px-1 text-[10px] font-medium border rounded capitalize transition-colors",
                                settings.stitchType === type
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            {type === 'run' ? 'Corrido' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* OPERATIONS */}
            <div className="space-y-3 pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                    Operaciones
                </h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={async () => {
                            // Logic to convert current selected object to Satin
                            // We need to get the points from the selected object (canvas).
                            // Since we don't have direct access to canvas object points here easily without store helper,
                            // we might need to assume the layer paths are the source.
                            if (selectedLayer && selectedLayer.paths && selectedLayer.paths.length > 0) {
                                // Taking the first path for now as 'path' 
                                // (Complex objects might have multiple, specialized handling needed later)
                                const pathPoints = selectedLayer.paths[0].map((p: any) => ({ x: p[0], y: p[1] }));

                                import('@/services/stitchService').then(async ({ stitchService }) => {
                                    try {
                                        const stitches = await stitchService.generateSatin(pathPoints, 4.0, 0.4);
                                        // Update layer with new stitches? Or create new layer?
                                        // User expects "Convert", so let's update.
                                        // Backend returns points. We need to format back to [[x,y]...] for layer storage
                                        const newPath = stitches.map(p => [p.x, p.y]);

                                        useEditorStore.getState().updateLayerSettings(selectedLayerId, { ...settings, stitchType: 'satin' });
                                        // We need a way to update the PATHS of the layer too.
                                        // Adding updateLayerPaths to store would be ideal, but for now let's modify layers directly via setLayers 
                                        // or just assume we visualize the 'type' change.

                                        // CRITICAL: EditorCanvas currently renders PATHS. 
                                        // If we want to show the zigzag, we must replace the path with the zigzag path.
                                        const newLayers = layers.map(l => l.id === selectedLayerId ? { ...l, paths: [newPath] } : l);
                                        setLayers(newLayers);

                                    } catch (e) { console.error(e); }
                                });
                            }
                        }}
                        className="w-full py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                        Generar Satín (Auto)
                    </button>

                    <button
                        onClick={() => {
                            if (selectedLayer && selectedLayer.paths && selectedLayer.paths.length > 0) {
                                const polyPoints = selectedLayer.paths[0].map((p: any) => ({ x: p[0], y: p[1] }));

                                import('@/services/stitchService').then(async ({ stitchService }) => {
                                    try {
                                        const steps = await stitchService.generateApplique(polyPoints);

                                        // Applique creates 3 new layers or replaces?
                                        // Usually creates 3 layers.
                                        const newLayers = steps.map((step, idx) => ({
                                            id: `${selectedLayerId}-app-${idx}`,
                                            name: step.name,
                                            color: step.color,
                                            visible: true,
                                            locked: false,
                                            paths: step.paths, // already in [[x,y]...] format from backend
                                            settings: {
                                                density: step.type === 'satin' ? 0.4 : 4.0,
                                                pullCompensation: 0,
                                                underlay: false,
                                                angle: 0,
                                                stitchType: step.type as any
                                            }
                                        }));

                                        // Insert after current or replace? Let's add them.
                                        const allLayers = [...layers, ...newLayers];
                                        setLayers(allLayers);

                                    } catch (e) { console.error(e); }
                                });
                            }
                        }}
                        className="w-full py-2 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                    >
                        Crear Appliqué (3 Pasos)
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Preajustes de Tela
                </h3>
                <p className="text-xs text-gray-500">Configuración automática según tu material.</p>

                <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="custom">Personalizado / Manual</option>
                    {FABRIC_PRESETS.map(preset => (
                        <option key={preset.id} value={preset.id}>
                            {preset.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Sliders size={16} />
                        Configuración Avanzada
                    </label>
                    <button
                        onClick={() => setAdvancedMode(!advancedMode)}
                        className={clsx(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                            advancedMode ? "bg-blue-600" : "bg-gray-200"
                        )}
                    >
                        <span className={clsx(
                            "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                            advancedMode ? "translate-x-5" : "translate-x-1"
                        )} />
                    </button>
                </div>

                <div className={clsx("space-y-4 transition-opacity", !advancedMode && "opacity-60 pointer-events-none")}>

                    {/* Density Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Densidad (Espaciado)</span>
                            <span className="font-mono text-gray-900">{settings.density || 4.0} mm</span>
                        </div>
                        <input
                            type="range"
                            min="2.0" max="10.0" step="0.1"
                            value={settings.density || 4.0}
                            onChange={(e) => handleSettingChange('density', parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <p className="text-[10px] text-gray-400">Menor = Puntadas más cerradas</p>
                    </div>

                    {/* Pull Compensation Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Compensación de Tensión</span>
                            <span className="font-mono text-gray-900">{settings.pullCompensation || 0} mm</span>
                        </div>
                        <input
                            type="range"
                            min="0.0" max="1.0" step="0.05"
                            value={settings.pullCompensation || 0}
                            onChange={(e) => handleSettingChange('pullCompensation', parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* Max Stitch Length Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Largo Máx. Puntada</span>
                            <span className="font-mono text-gray-900">{settings.stitchLength || 3.5} mm</span>
                        </div>
                        <input
                            type="range"
                            min="1.0" max="12.0" step="0.1"
                            value={settings.stitchLength || 3.5}
                            onChange={(e) => handleSettingChange('stitchLength', parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* OPTIMIZATION TOGGLES */}
                    <div className="pt-2 border-t border-gray-100 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-gray-700">Short Stitches</span>
                            <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                                <input
                                    type="checkbox"
                                    checked={settings.shortStitches ?? true}
                                    onChange={(e) => handleSettingChange('shortStitches', e.target.checked ? 1 : 0)}
                                    className="absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    style={{ right: settings.shortStitches !== false ? '0' : '50%', borderColor: settings.shortStitches !== false ? '#2563EB' : '#ccc' }}
                                />
                                <span className={clsx("block overflow-hidden h-4 rounded-full cursor-pointer", settings.shortStitches !== false ? "bg-blue-600" : "bg-gray-300")}></span>
                            </div>
                        </label>
                        <p className="text-[10px] text-gray-400 -mt-2">Evita amontonamiento en curvas agudas.</p>

                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-medium text-gray-700">Auto-Branching</span>
                            <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                                <input
                                    type="checkbox"
                                    checked={settings.autoBranching ?? true}
                                    onChange={(e) => handleSettingChange('autoBranching', e.target.checked ? 1 : 0)}
                                    className="absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                    style={{ right: settings.autoBranching !== false ? '0' : '50%', borderColor: settings.autoBranching !== false ? '#2563EB' : '#ccc' }}
                                />
                                <span className={clsx("block overflow-hidden h-4 rounded-full cursor-pointer", settings.autoBranching !== false ? "bg-blue-600" : "bg-gray-300")}></span>
                            </div>
                        </label>
                        <p className="text-[10px] text-gray-400 -mt-2">Minimiza cortes conectando objetos.</p>
                    </div>

                    {/* Lock Overlay if disabled */}
                    {!advancedMode && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            {/* Optional: could show a lock icon, but the opacity handles visual cue well */}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
                {!advancedMode ? (
                    <p className="flex items-center gap-1 justify-center"><Lock size={12} /> Optimizado para {selectedPreset !== 'custom' ? FABRIC_PRESETS.find(p => p.id === selectedPreset)?.label : 'Selección Actual'}</p>
                ) : (
                    <p className="flex items-center gap-1 justify-center text-blue-500"><Unlock size={12} /> Control Manual Activo</p>
                )}
            </div>

        </div>
    );
}
