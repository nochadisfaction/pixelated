import { createClient } from '@supabase/supabase-js'

console.log('🌱 Pixelated Empathy - Seeding Data')
console.log('===================================')
console.log('')

// Supabase credentials
const SUPABASE_URL = 'https://dihivzkwbwpkpebichlk.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaGl2emt3Yndwa3BlYmljaGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQ4MDk1MCwiZXhwIjoyMDY0MDU2OTUwfQ.ASiLbSrSUmPQD7g3Vs-zkgzbne2PqyjA3hw4VThkonM'

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

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
  
  // Test that we can read the data
  const { data, error: readError } = await supabase.from('todos').select('*')
  
  if (readError) {
    console.log('❌ Error reading data:', readError.message)
    return false
  }
  
  console.log(`✅ Verified: ${data.length} todos found in database`)
  return true
}

async function main() {
  try {
    console.log('🔗 Connecting to Supabase...')
    
    // Seed data
    const success = await seedTodos()
    
    if (success) {
      console.log('')
      console.log('🎉 Database seeding complete!')
      console.log('You can now visit your application and see the todos listed.')
      console.log('')
      console.log('Next steps:')
      console.log('1. Update your .env file with:')
      console.log(`   SUPABASE_URL=${SUPABASE_URL}`)
      console.log('   SUPABASE_KEY=your-anon-key-here  (NOT the service role key)')
      console.log('2. Start your dev server: pnpm dev')
      console.log('3. Visit http://localhost:4321 to see your todos!')
    }
    
  } catch (error) {
    console.error('💥 Seeding failed:', error.message)
  }
}

main() 