import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://slklnbsqduxeydgnzfmv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa2xuYnNxZHV4ZXlkZ256Zm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTAwNzIsImV4cCI6MjA5MzM2NjA3Mn0.JF7ofJbpZ-dqmzofD7u6dsIa2QYPIKx-LorW5JBlQTQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
