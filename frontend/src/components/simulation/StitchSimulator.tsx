"use client";

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useSimulationEngine } from '@/hooks/useSimulationEngine';
import { Play, Pause, X } from 'lucide-react';
import clsx from 'clsx';

interface StitchSimulatorProps {
    onClose: () => void;
}

export default function StitchSimulator({ onClose }: StitchSimulatorProps) {
    const { layers } = useEditorStore();
    const { stitches, stats, controls, refs } = useSimulationEngine(layers);
    const magnifierRef = useRef<HTMLCanvasElement>(null);

    // Renderer Hook
    useEffect(() => {
        const canvas = refs.canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Ghost (faint background of all stitches)
        // Optimization: Could cache this in an offscreen canvas
        if (stitches.length > 0) {
            ctx.globalAlpha = 0.15;
            ctx.lineWidth = 1;

            // Draw all lines quickly
            let prev = stitches[0];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            // Limit ghost drawing if too heavy, but for <10k it's fine
            for (let i = 1; i < stitches.length; i++) {
                const p = stitches[i];
                if (p.color !== prev.color) {
                    ctx.stroke();
                    ctx.strokeStyle = prev.color; // Use basic color logic or cache by layer
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
                prev = p;
            }
            ctx.strokeStyle = '#000'; // Fallback
            ctx.stroke();
        }

        // Draw Live Stitches
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 2; // Thicker for visibility
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stats.currentStitchIndex > 0 && stitches.length > 0) {
            let prev = stitches[0];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.strokeStyle = prev.color; // Initial color

            // Determine rendering range. 
            // Full redraw every frame is expensive for 50k stitches.
            // Optimization: Draw only new segments if we kept previous frame? 
            // React re-renders component, but canvas persists.
            // Better: Redraw everything to be safe for seeking logic.

            for (let i = 1; i < stats.currentStitchIndex; i++) {
                const p = stitches[i];

                // Color Change check
                if (p.color !== prev.color) {
                    ctx.stroke(); // Draw pending
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.strokeStyle = p.color;
                } else {
                    ctx.lineTo(p.x, p.y);
                }
                prev = p;
            }
            ctx.stroke();
        }

        // --- Magnifier Renderer ---
        const magCanvas = magnifierRef.current;
        const magCtx = magCanvas?.getContext('2d');

        if (magCanvas && magCtx && stitches.length > 0) {
            magCtx.clearRect(0, 0, magCanvas.width, magCanvas.height);

            // Current needle position
            const safeIndex = Math.min(stats.currentStitchIndex, stitches.length - 1);
            const needle = stitches[safeIndex];

            if (needle) {
                // Transform: Scale 5x, Translate to put needle in center
                magCtx.save();
                magCtx.translate(magCanvas.width / 2, magCanvas.height / 2);
                magCtx.scale(5, 5);
                magCtx.translate(-needle.x, -needle.y);

                // Draw nearby stitches (Ghost-like context)
                // Draw full design again? Expensive. 
                // Draw only window? Complex logic.
                // Draw full design but clipped? Easier.

                // Draw simplified version for magnifier
                magCtx.lineWidth = 0.5;
                magCtx.globalAlpha = 0.3;
                // ... Draw subset of stitches ...
                // For performance, let's just draw the live portion
                if (stats.currentStitchIndex > 0) {
                    magCtx.globalAlpha = 1.0;
                    magCtx.lineWidth = 1;
                    let mPrev = stitches[0];
                    magCtx.beginPath();
                    magCtx.moveTo(mPrev.x, mPrev.y);
                    magCtx.strokeStyle = mPrev.color;

                    for (let i = 1; i < stats.currentStitchIndex; i++) {
                        const mp = stitches[i];
                        if (mp.color !== mPrev.color) {
                            magCtx.stroke();
                            magCtx.beginPath();
                            magCtx.moveTo(mp.x, mp.y);
                            magCtx.strokeStyle = mp.color;
                        } else {
                            magCtx.lineTo(mp.x, mp.y);
                        }
                        mPrev = mp;
                    }
                    magCtx.stroke();
                }

                // Draw Needle Point Cursor
                magCtx.restore(); // Back to screen coords

                // Crosshair
                magCtx.beginPath();
                magCtx.strokeStyle = 'red';
                magCtx.lineWidth = 2;
                magCtx.moveTo(magCanvas.width / 2 - 10, magCanvas.height / 2);
                magCtx.lineTo(magCanvas.width / 2 + 10, magCanvas.height / 2);
                magCtx.moveTo(magCanvas.width / 2, magCanvas.height / 2 - 10);
                magCtx.lineTo(magCanvas.width / 2, magCanvas.height / 2 + 10);
                magCtx.stroke();
            }
        }

    }, [stitches, stats.currentStitchIndex]);

    return (
        <div className="fixed inset-0 z-50 bg-white/95 flex flex-col items-center justify-center backdrop-blur-sm">
            {/* Header / Dismiss */}
            <div className="absolute top-4 right-4 z-50">
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
                    <X size={24} className="text-gray-600" />
                </button>
            </div>

            <div className="relative w-full h-full max-w-6xl max-h-[80vh] flex">

                {/* Main Canvas Area */}
                <div className="flex-1 relative bg-white shadow-lg border border-gray-100 m-4 rounded-xl overflow-hidden flex items-center justify-center">
                    <canvas
                        ref={refs.canvasRef}
                        width={1000}
                        height={800}
                        className="w-full h-full object-contain"
                    />

                    {/* Magnifier Overlay (Floating Portal) */}
                    <div className="absolute bottom-8 right-8 w-48 h-48 bg-white border-4 border-gray-800 rounded-full shadow-2xl overflow-hidden z-20">
                        <canvas
                            ref={magnifierRef}
                            width={200}
                            height={200}
                            className="w-full h-full"
                        />
                        {/* Glossy overlay effect */}
                        <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"></div>
                    </div>
                </div>

            </div>

            {/* Notion-style Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-xl rounded-full px-8 py-4 flex items-center gap-6 z-50">

                <button
                    onClick={controls.togglePlay}
                    className="w-12 h-12 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                    {stats.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>

                <div className="flex flex-col gap-1 w-64">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>{(stats.progress * 100).toFixed(0)}%</span>
                        <span>{stats.currentStitchIndex} / {stats.totalStitches} sts</span>
                    </div>
                    {/* Minimalist Slider */}
                    <input
                        type="range"
                        min="0" max="1" step="0.001"
                        value={stats.progress}
                        onChange={(e) => controls.setProgress(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>

                <div className="h-8 w-px bg-gray-200 mx-2"></div>

                {/* Speed Controls */}
                <div className="flex items-center gap-2">
                    <button onClick={() => controls.setSpeed(5)} className={clsx("text-xs font-bold px-2 py-1 rounded", stats.speed === 5 ? "bg-gray-100" : "text-gray-400")}>1x</button>
                    <button onClick={() => controls.setSpeed(20)} className={clsx("text-xs font-bold px-2 py-1 rounded", stats.speed === 20 ? "bg-gray-100" : "text-gray-400")}>5x</button>
                    <button onClick={() => controls.setSpeed(100)} className={clsx("text-xs font-bold px-2 py-1 rounded", stats.speed === 100 ? "bg-gray-100" : "text-gray-400")}>MAX</button>
                </div>
            </div>

        </div>
    );
}
