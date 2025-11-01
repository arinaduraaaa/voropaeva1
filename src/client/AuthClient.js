import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sqdddlanleuwlsehgeem.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZGRkbGFubGV1d2xzZWhnZWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY1Nzk2MiwiZXhwIjoyMDc3MjMzOTYyfQ.fPyJTAoJBRYfUv4f4Mk2DCsY28RCHWl5LqZuRyEkFwU'; 

export const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth: {
            persistSession: true,
            storage: localStorage
        }
    }
)
