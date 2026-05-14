
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const WHATSAPP_ENDPOINT = Deno.env.get('WHATSAPP_ENDPOINT')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Full Webhook Payload:", JSON.stringify(payload, null, 2))

    // Supabase Webhooks can wrap the row in a 'record' object
    const record = payload.record || payload
    console.log("Extracted Record:", JSON.stringify(record, null, 2))

    // Check if it's a 'one-time' task OR given by Abhishek Agrawal (MD)
    const isOneTime = record.freq === 'one-time'
    const isAbhishek = record.given_by_username === 'Abhishek Agrawal (MD)'

    if (!isOneTime && !isAbhishek) {
      console.log(`Skipping: Frequency is '${record.freq}' and Given By is '${record.given_by_username}'`)
      return new Response(JSON.stringify({ message: `Skipping: Not one-time and not given by MD` }), { status: 200 })
    }

    if (!record.whatsapp_no) {
      console.log("Error: Missing 'whatsapp_no' in record")
      return new Response(JSON.stringify({ error: "Missing whatsapp_no" }), { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Prevent multiple notifications for recurring tasks in the same batch
    if (!isOneTime) {
      const { data: earlierTasks, error: checkError } = await supabase
        .from('master_tasks')
        .select('task_id')
        .match({
          task_title: record.task_title,
          name: record.name,
          given_by_username: record.given_by_username,
          timestamp: record.timestamp
        })
        .lt('task_start_date', record.task_start_date)
        .limit(1)

      if (checkError) {
        console.error("Error checking for earlier tasks:", checkError)
      } else if (earlierTasks && earlierTasks.length > 0) {
        console.log(`Skipping recurring task in batch: ${record.task_title} for ${record.task_start_date}`)
        return new Response(JSON.stringify({ message: "Skipping recurring task in batch" }), { status: 200 })
      }
    }

    // Lookup user by their full name to get username (Removed password lookup)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('full_name', record.name)
      .single()

    if (userError) {
      console.error(`User lookup error for ${record.name}:`, userError)
    }

    const username = userData?.username || "N/A"

    // Prepend 91 for India and remove any non-digit characters
    const cleanNumber = record.whatsapp_no.toString().replace(/\D/g, '')
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`

    console.log(`Attempting to send Template WhatsApp message to: ${fullNumber} using template: one_time_task_notification`)

    if (!WHATSAPP_ENDPOINT || !WHATSAPP_ACCESS_TOKEN) {
      console.error("Error: Missing WHATSAPP_ENDPOINT or WHATSAPP_ACCESS_TOKEN environment variables")
      throw new Error("Meta API configuration missing")
    }

    const response = await fetch(WHATSAPP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: fullNumber,
        type: "template",
        template: {
          name: "one_time_task_notification", // Updated name as requested
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: record.name },             // {{1}}
                { type: "text", text: username },                // {{2}}
                { type: "text", text: record.task_title },       // {{3}}
                { type: "text", text: record.task_description || 'N/A' }, // {{4}}
                { type: "text", text: record.department || 'N/A' }, // {{5}}
                { type: "text", text: record.task_start_date },  // {{6}}
                { type: "text", text: record.given_by_username } // {{7}}
              ]
            }
          ]
        }
      }),
    })

    const result = await response.json()
    console.log("Meta API Response Result:", JSON.stringify(result, null, 2))

    if (!response.ok) {
      console.error(`Meta API Error (Status ${response.status}):`, result)
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: response.status,
    })
  } catch (error) {
    console.error("Critical Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
