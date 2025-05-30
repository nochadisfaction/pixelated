import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current file directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Pixelated Empathy Database Setup')
console.log('=====================================')
console.log('')

// You'll need to replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://dihivzkwbwpkpebichlk.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaGl2emt3Yndwa3BlYmljaGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQ4MDk1MCwiZXhwIjoyMDY0MDU2OTUwfQ.ASiLbSrSUmPQD7g3Vs-zkgzbne2PqyjA3hw4VThkonM'

if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ Please update the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this file with your actual credentials')
  console.log('')
  console.log('You can find these in your Supabase dashboard:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Click on Settings > API')
  console.log('3. Copy the "Project URL" for SUPABASE_URL')
  console.log('4. Copy the "service_role" key for SUPABASE_SERVICE_ROLE_KEY')
  console.log('')
  console.log('Then update lines 12-13 in this file and run again.')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createTodosTable() {
  console.log('📝 Creating todos table...')
  
  // First create the table using direct SQL
  const { error: createError } = await supabase
    .rpc('exec_sql', { 
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.todos (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    })

  if (createError) {
    console.log('❌ Error creating table with exec_sql, trying direct approach...')
    console.log('❌ Error:', createError.message)
    
    console.log('')
    console.log('Please run this SQL manually in your Supabase SQL editor:')
    console.log('========================================================')
    console.log(`
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read access" ON public.todos
  FOR SELECT USING (true);

-- Allow authenticated users full access
CREATE POLICY "Users can insert their own todos" ON public.todos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own todos" ON public.todos
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own todos" ON public.todos
  FOR DELETE USING (true);
    `)
    console.log('')
    console.log('After running the SQL above, press Enter to continue with seeding...')
    return false
  }

  // Add RLS and policies
  const { error: rlsError } = await supabase
    .rpc('exec_sql', { 
      sql_query: `
        ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow anonymous read access" ON public.todos;
        CREATE POLICY "Allow anonymous read access" ON public.todos
          FOR SELECT USING (true);
      `
    })

  if (rlsError) {
    console.log('⚠️ Warning: Could not set up RLS policies:', rlsError.message)
  }
  
  console.log('✅ Table created successfully!')
  return true
}

async function seedTodos() {
  console.log('🌱 Seeding sample todos...')
  
  const todos = [
    { name: 'Learn Astro Framework', description: 'Study the Astro framework for building modern web applications', completed: false },
    { name: 'Set up Supabase Database', description: 'Configure and populate the new Supabase database', completed: true },
    { name: 'Implement AI Chat Features', description: 'Add AI-powered chat functionality for therapy sessions', completed: false },
    { name: 'Create User Authentication', description: 'Set up secure user login and registration system', completed: false },
    { name: 'Design UI Components', description: 'Build reusable UI components with proper styling', completed: false },
    { name: 'Write Unit Tests', description: 'Add comprehensive test coverage for all features', completed: false },
    { name: 'Deploy to Production', description: 'Deploy the application to production environment', completed: false }
  ]

  const { error } = await supabase.from('todos').insert(todos)
  
  if (error) {
    console.log('❌ Error seeding data:', error.message)
    return false
  }
  
  console.log('✅ Sample todos inserted successfully!')
  return true
}

async function main() {
  try {
    console.log('🔌 Connecting to Supabase...')
    
    // Create table
    const tableCreated = await createTodosTable()
    if (!tableCreated) {
      console.log('⚠️ Please run the SQL manually and then run the script again to seed data')
      return
    }
    
    // Seed data
    await seedTodos()
    
    console.log('')
    console.log('🎉 Database setup complete!')
    console.log('You can now visit your application and see the todos listed.')
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message)
  }
}

main() 