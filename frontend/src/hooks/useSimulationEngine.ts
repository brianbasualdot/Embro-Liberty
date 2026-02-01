import { useState, useEffect, useRef, useCallback } from 'react';
import { Layer } from '@/types/embroidery';

interface StitchPoint {
    x: number;
    y: number;
    color: string;
    layerId: string;
}

interface SimulationState {
    isPlaying: boolean;
    progress: number; // 0 to 1
    currentStitchIndex: number;
    speed: number; // Stitches per frame (e.g., 1, 5, 10, 50)
    totalStitches: number;
}

export function useSimulationEngine(layers: Layer[]) {
    const [stitches, setStitches] = useState<StitchPoint[]>([]);
    const [simState, setSimState] = useState<SimulationState>({
        isPlaying: false,
        progress: 0,
        currentStitchIndex: 0,
        speed: 10,
        totalStitches: 0
    });

    const requestRef = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ghostCanvasRef = useRef<HTMLCanvasElement>(null);

    // 1. Discretize Layers into Stitch Points
    useEffect(() => {
        const generatedStitches: StitchPoint[] = [];

        layers.forEach(layer => {
            if (!layer.visible || !layer.paths) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            layer.paths.forEach((path: any) => {
                if (!Array.isArray(path) || path.length < 2) return;

                // Simple discretization: Just take the points for now
                // In a real engine, we would interpolate if distance > maxStitchLen
                for (let i = 0; i < path.length; i++) {
                    generatedStitches.push({
                        x: path[i][0],
                        y: path[i][1],
                        color: layer.color,
                        layerId: layer.id
                    });
                }
            });
        });

        setStitches(generatedStitches);
        setSimState(prev => ({ ...prev, totalStitches: generatedStitches.length, currentStitchIndex: 0, progress: 0 }));

    }, [layers]);


    // 2. Animation Loop
    useEffect(() => {
        let animationFrameId: number;

        const animate = () => {
            setSimState(prev => {
                if (!prev.isPlaying || prev.currentStitchIndex >= prev.totalStitches) {
                    return { ...prev, isPlaying: false };
                }

                const nextIndex = Math.min(prev.currentStitchIndex + prev.speed, prev.totalStitches);
                return {
                    ...prev,
                    currentStitchIndex: nextIndex,
                    progress: nextIndex / prev.totalStitches
                };
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        if (simState.isPlaying) {
            animationFrameId = requestAnimationFrame(animate);
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [simState.isPlaying]);


    // 3. Controls
    const togglePlay = () => setSimState(s => ({ ...s, isPlaying: !s.isPlaying }));
    const setSpeed = (speed: number) => setSimState(s => ({ ...s, speed }));
    const setProgress = (val: number) => {
        const index = Math.floor(val * simState.totalStitches);
        setSimState(s => ({ ...s, progress: val, currentStitchIndex: index }));
    };

    return {
        stitches,
        stats: simState,
        controls: { togglePlay, setSpeed, setProgress },
        refs: { canvasRef, ghostCanvasRef }
    };
}
