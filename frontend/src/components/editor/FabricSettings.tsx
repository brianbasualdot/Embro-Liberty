"use client";

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { FABRIC_PRESETS } from '@/constants/fabrics';
import { Sliders, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';

export default function FabricSettings() {
    const { selectedLayerId, layers, setLayers } = useEditorStore();
    const [advancedMode, setAdvancedMode] = useState(false);

    const selectedLayer = layers.find(l => l.id === selectedLayerId);

    // Local state for sliders to perform smoothly, synced with store
    const [settings, setSettings] = useState(selectedLayer?.settings || {});
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

    if (!selectedLayer) {
        return (
            <div className="p-4 text-gray-400 text-sm text-center">
                Select a layer to configure fabric settings
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 bg-white border-l border-[#e5e5e5] h-full w-80 overflow-y-auto">

            <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Fabric Presets
                </h3>
                <p className="text-xs text-gray-500">Auto-configure settings for your material.</p>

                <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="custom">Custom / Manual</option>
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
                        Advanced Configuration
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
                            <span className="text-gray-600">Density (Spacing)</span>
                            <span className="font-mono text-gray-900">{settings.density || 4.0} mm</span>
                        </div>
                        <input
                            type="range"
                            min="2.0" max="10.0" step="0.1"
                            value={settings.density || 4.0}
                            onChange={(e) => handleSettingChange('density', parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <p className="text-[10px] text-gray-400">Lower = Tighter stitches</p>
                    </div>

                    {/* Pull Compensation Slider */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Pull Compensation</span>
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
                            <span className="text-gray-600">Max Stitch Length</span>
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
                    <p className="flex items-center gap-1 justify-center"><Lock size={12} /> Settings optimized for {selectedPreset !== 'custom' ? FABRIC_PRESETS.find(p => p.id === selectedPreset)?.label : 'Current Selection'}</p>
                ) : (
                    <p className="flex items-center gap-1 justify-center text-blue-500"><Unlock size={12} /> Manual Override Active</p>
                )}
            </div>

        </div>
    );
}
