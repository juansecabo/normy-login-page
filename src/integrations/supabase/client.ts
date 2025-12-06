import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://npdtggwzodtssnicmkux.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZHRnZ3d6b2R0c3NuaWNta3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NzIzMjEsImV4cCI6MjA3MTI0ODMyMX0.fkXjbs2_injmieaipIVHSWmMFep0e0tXX2y8AFRGWnY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
