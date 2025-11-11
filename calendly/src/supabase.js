// src/supabase.js
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://hjmdrscigbqplpbpgzxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqbWRyc2NpZ2JxcGxwYnBnenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODk0NzIsImV4cCI6MjA3ODI2NTQ3Mn0.57MjkkumL5eqzo-0tVhTc9eenuXd-sH_A5uwHhbnD80';
export const supabase = createClient(supabaseUrl, supabaseKey);
