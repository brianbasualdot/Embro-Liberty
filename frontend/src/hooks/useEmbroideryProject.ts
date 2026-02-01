import { createClient } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

// NOTE: These should be in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export function useEmbroideryProject(projectId: string | null) {
    const { layers } = useEditorStore();
    const layersRef = useRef(layers);

    // Keep ref updated for effect
    useEffect(() => {
        layersRef.current = layers;
    }, [layers]);

    // Debounced Auto-save
    useEffect(() => {
        if (!projectId) return;

        const saveProject = async () => {
            console.log("Saving project to Supabase...", projectId);

            // This is a mock implementation until tables are set up
            // const { error } = await supabase
            //   .from('projects')
            //   .update({ 
            //       layers: layersRef.current,
            //       updated_at: new Date()
            //   })
            //   .eq('id', projectId);
        };

        const handler = setTimeout(saveProject, 2000);

        return () => clearTimeout(handler);
    }, [layers, projectId]);

    return { supabase };
}
