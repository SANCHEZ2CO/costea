
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Faltan las variables de entorno de Supabase. La conexión fallará.');
}

// Determine the redirect URL based on environment
export const getAuthRedirectUrl = () => {
    // Check if we're in production
    if (window.location.hostname === 'costea.sanchez2.co') {
        return 'https://costea.sanchez2.co';
    }
    // Default to localhost for development
    return 'http://localhost:5173';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    }
});
