"use client";

import { useEffect, useRef, useState } from 'react';
import { HOOP_PRESETS } from '@/constants/hoops';
import { useEditorStore } from '@/store/editorStore';
// ... rest ...

export default function EditorCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [fabricCanvas, setFabricCanvas] = useState<any | null>(null);
    const { layers, activeTool, updateLayerStitchCount, selectedHoopId } = useEditorStore();
    const fabricRef = useRef<any>(null);

    // Initialize Fabric Canvas
    useEffect(() => {
        if (!canvasRef.current || fabricCanvas) return;

        const initFabric = async () => {
            try {
                // Fabric v6/v7 often exports named exports.
                const fabricModule = await import('fabric');
                // Check if it's strictly a namespace or uses default
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fabric = (fabricModule as any).default || fabricModule;
                fabricRef.current = fabric;

                // Safely instantiate
                // In v6+, it might be fabric.Canvas or just Canvas if we destructured. 
                // Using the 'fabric' namespace object pattern.
                if (!fabric.Canvas) {
                    console.error("Fabric Canvas constructor not found in module", fabric);
                    return;
                }

                const canvas = new fabric.Canvas(canvasRef.current, {
                    width: window.innerWidth - (256 + 320), // Adjust for Left Sidebar (256) + Right Sidebar (320)
                    height: window.innerHeight - 56, // Adjust for Top Bar (56)
                    backgroundColor: '#ffffff',
                    selection: true,
                    preserveObjectStacking: true,
                });

                setFabricCanvas(canvas);

                const handleResize = () => {
                    if (canvas && typeof canvas.setWidth === 'function') {
                        canvas.setWidth(window.innerWidth - (256 + 320));
                        canvas.setHeight(window.innerHeight - 56);
                        canvas.renderAll();
                    }
                };

                window.addEventListener('resize', handleResize);

                // Don't call handleResize immediately if we just set dims in constructor
                // but for safety/consistency:
                // handleResize(); 

                return () => {
                    window.removeEventListener('resize', handleResize);
                    canvas.dispose();
                };
            } catch (e) {
                console.error("Failed to load fabric", e);
                return () => { };
            }
        };

        const cleanup = initFabric();
        return () => {
            cleanup.then(f => f && f());
        };
    }, [fabricCanvas]);

    // Sync Layers with Canvas
    useEffect(() => {
        if (!fabricCanvas || !fabricRef.current) return;

        const fabric = fabricRef.current;

        // Clear existing objects but keep background
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#ffffff';
        fabricCanvas.renderAll();

        layers.forEach((layer) => {
            if (!layer.visible) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (layer.paths) {
                layer.paths.forEach((pathPoints: any[]) => {
                    if (!Array.isArray(pathPoints) || pathPoints.length < 2) return;

                    const points = pathPoints.map(p => ({ x: p[0], y: p[1] }));

                    const polygon = new fabric.Polygon(points, {
                        fill: 'transparent',
                        stroke: layer.color,
                        strokeWidth: 0.4, // Real 0.4mm thread thickness
                        strokeLineCap: 'round',
                        strokeLineJoin: 'round',
                        selectable: true,
                        perPixelTargetFind: true,
                        name: layer.id,
                        objectCaching: false,
                        // 3D Shadow for "Relief" effect
                        shadow: new fabric.Shadow({
                            color: 'rgba(0,0,0,0.3)',
                            blur: 1,
                            offsetX: 0.5,
                            offsetY: 0.5
                        })
                    });

                    fabricCanvas.add(polygon);
                });
            }
        });

        fabricCanvas.renderAll();

    }, [fabricCanvas, layers]); // Re-run when layers change

    // Draw Hoop Helper
    useEffect(() => {
        if (!fabricCanvas || !selectedHoopId) return;
        const fabric = fabricRef.current;

        // Clear existing hoop
        fabricCanvas.getObjects().forEach((obj: any) => {
            if (obj.isHoop) fabricCanvas.remove(obj);
        });

        const hoopDef = HOOP_PRESETS.find(h => h.id === selectedHoopId);
        if (hoopDef) {
            // Assume 10px = 1mm (scaling or as defined in export)
            // Actually, usually Fabric 1 unit = 1 px. 
            // If export uses 1 unit = 0.1mm, then 10 units = 1mm.
            // Let's assume for visual 1 unit = 1 pixel for now and scale later, 
            // OR assume standard 96 DPI where 1mm approx 3.78px.
            // Let's stick to a simple 10 scale factor relative to screen for now or 1:1 if zoomed.
            // Let's standardise: 1 unit on canvas = 1 mm (easiest for CAD).
            // Canvas width 800-1000. Hoop 100mm.

            const scale = 3; // Zoom factor reduced to fit larger hoops (260mm * 3 = 780px)

            const hoopRect = new fabric.Rect({
                left: fabricCanvas.width! / 2,
                top: fabricCanvas.height! / 2,
                originX: 'center',
                originY: 'center',
                width: hoopDef.width * scale,
                height: hoopDef.height * scale,
                fill: 'transparent',
                stroke: 'rgba(255, 0, 0, 0.3)',
                strokeWidth: 2,
                strokeDashArray: [10, 5],
                selectable: false,
                evented: false,
                // @ts-ignore
                isHoop: true,
                rx: hoopDef.shape === 'oval' ? 20 : 0,
                ry: hoopDef.shape === 'oval' ? 20 : 0
            });

            fabricCanvas.add(hoopRect);
            fabricCanvas.sendObjectToBack(hoopRect);
            fabricCanvas.requestRenderAll();

            // Validation Event
            const checkBounds = (e: any) => {
                const obj = e.target;
                if (!obj) return;

                const bound = obj.getBoundingRect();
                // Simple Check: is center somewhat inside? Or full containment?
                // Full containment is hard due to rotation. 
                // Let's check if Center is inside Hoop.

                // Hoop Bounds
                const hLeft = (fabricCanvas.width! / 2) - (hoopDef.width * scale / 2);
                const hRight = (fabricCanvas.width! / 2) + (hoopDef.width * scale / 2);
                const hTop = (fabricCanvas.height! / 2) - (hoopDef.height * scale / 2);
                const hBottom = (fabricCanvas.height! / 2) + (hoopDef.height * scale / 2);

                const center = obj.getCenterPoint();

                if (center.x < hLeft || center.x > hRight || center.y < hTop || center.y > hBottom) {
                    // TOAST ALERT
                    alert(`⚠️ Warning: Design is outside ${hoopDef.name} area!`);
                    obj.set('opacity', 0.5); // Visual feedback
                } else {
                    obj.set('opacity', 1.0);
                }
            };

            fabricCanvas.on('object:modified', checkBounds);
            fabricCanvas.on('object:moving', checkBounds);

            return () => {
                fabricCanvas.off('object:modified', checkBounds);
                fabricCanvas.off('object:moving', checkBounds);
            }
        }

    }, [fabricCanvas, selectedHoopId]);

    // Tool Interactions & Events
    useEffect(() => {
        if (!fabricCanvas) return;

        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();

        // Remove old event listeners to prevent duplicates
        fabricCanvas.off('object:modified');
        fabricCanvas.off('selection:created');
        fabricCanvas.off('selection:updated');
        fabricCanvas.off('selection:cleared');

        // Helper to update store with current transform
        const updateTransformStore = (obj: any) => {
            if (!obj) {
                useEditorStore.getState().setActiveTransform(null);
                return;
            }
            useEditorStore.getState().setActiveTransform({
                x: Math.round(obj.left || 0),
                y: Math.round(obj.top || 0),
                width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
                height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
                rotation: Math.round(obj.angle || 0),
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1
            });
        };

        const onSelection = (e: any) => {
            const obj = e.selected ? e.selected[0] : e.target;
            if (activeTool === 'node_edit') {
                // ... node edit logic if needed
            }
            updateTransformStore(obj);
        };

        fabricCanvas.on('selection:created', onSelection);
        fabricCanvas.on('selection:updated', onSelection);
        fabricCanvas.on('selection:cleared', () => updateTransformStore(null));

        if (activeTool === 'select') {
            fabricCanvas.selection = true;
            fabricCanvas.forEachObject((obj: any) => {
                obj.selectable = true;
                obj.evented = true;
                obj.hasControls = true;
                obj.hasBorders = true;
            });
        } else if (activeTool === 'node_edit') {
            fabricCanvas.selection = false;
            // Allow selection but disable standard controls
            fabricCanvas.forEachObject((obj: any) => {
                obj.selectable = true;
                obj.evented = true;
                obj.hasControls = false; // Disable standard scaling/rotation controls
                obj.hasBorders = true;
            });
            // ... existing node edit logic ...
        } else {
            // Other tools (Pen, etc.)
            fabricCanvas.selection = false;
            fabricCanvas.forEachObject((obj: any) => {
                obj.selectable = false;
                obj.evented = false;
            });
        }

        // Common: Update stitch count on modification AND transform
        fabricCanvas.on('object:modified', (e: any) => {
            const obj = e.target;
            if (!obj) return;

            updateTransformStore(obj);

            if (obj.name) {
                // Rough estimation: Perimeter * Density * 2
                const newCount = Math.floor((obj.width * obj.scaleX + obj.height * obj.scaleY) * 2);
                updateLayerStitchCount(obj.name, newCount);
            }
        });

        // Also update on moving/scaling for liveness? 
        // Might be too many updates for Zustand, stick to 'modified' (end of drag) for now.

    }, [fabricCanvas, activeTool, updateLayerStitchCount]);

    // Listen for Property Panel changes
    const pendingTransformChange = useEditorStore(state => state.pendingTransformChange);
    const clearPendingTransformChange = useEditorStore(state => state.clearPendingTransformChange);

    useEffect(() => {
        if (!fabricCanvas || !pendingTransformChange) return;

        const activeObj = fabricCanvas.getActiveObject();
        if (!activeObj) return;

        const { key, value } = pendingTransformChange;

        switch (key) {
            case 'x': activeObj.set('left', value); break;
            case 'y': activeObj.set('top', value); break;
            case 'rotation': activeObj.set('angle', value); break;
            case 'width':
                // Scaling width keeping aspect ratio or just scaleX? Usually width change implies scale change in fabric
                // fabric width is static, we change scaleX
                if (activeObj.width) activeObj.set('scaleX', value / activeObj.width);
                break;
            case 'height':
                if (activeObj.height) activeObj.set('scaleY', value / activeObj.height);
                break;
        }

        activeObj.setCoords();
        fabricCanvas.requestRenderAll();
        clearPendingTransformChange();

    }, [fabricCanvas, pendingTransformChange, clearPendingTransformChange]);


    return (
        <div className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative">
            <canvas ref={canvasRef} />
        </div>
    );
}
