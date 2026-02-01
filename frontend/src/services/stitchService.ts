import { Layer } from '@/types/embroidery';

const API_URL = 'http://localhost:8000';

export interface AppliqueStep {
    name: string;
    type: 'run' | 'satin';
    color: string;
    paths: number[][][]; // List of contours, each contour is list of [x,y]
}

export const stitchService = {
    /**
     * Generate satin stitches from a path (polyline)
     */
    generateSatin: async (path: { x: number, y: number }[], width: number = 4.0, density: number = 0.4): Promise<{ x: number, y: number }[]> => {
        // backend expects [[x,y], [x,y]...]
        const pathArray = path.map(p => [p.x, p.y]);

        try {
            const res = await fetch(`${API_URL}/satin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pathArray, width, density })
            });
            const data = await res.json();
            // data.stitches is [[x,y]...]
            return data.stitches.map((p: number[]) => ({ x: p[0], y: p[1] }));
        } catch (error) {
            console.error("Error generating satin:", error);
            throw error;
        }
    },

    /**
     * Generate 3-step applique from a polygon
     */
    generateApplique: async (polygon: { x: number, y: number }[]): Promise<AppliqueStep[]> => {
        const polyArray = polygon.map(p => [p.x, p.y]);

        try {
            const res = await fetch(`${API_URL}/applique`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ polygon: polyArray })
            });
            const data = await res.json();
            return data.steps;
        } catch (error) {
            console.error("Error generating applique:", error);
            throw error;
        }
    }
};
