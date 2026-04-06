import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kazsghncfiumqwslokkh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthenNnaG5jZml1bXF3c2xva2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTY1ODQsImV4cCI6MjA4MTYzMjU4NH0.kvxqyy_BQ5Juay11vDgSXFLo0DYBrT1uM5Do5vEpeVA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getAllUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('username, full_name, role')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(JSON.stringify(data, null, 2))
}

getAllUsers()
