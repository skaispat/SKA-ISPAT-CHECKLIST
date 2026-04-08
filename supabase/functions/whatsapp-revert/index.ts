
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const WHATSAPP_ENDPOINT = Deno.env.get('WHATSAPP_ENDPOINT')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Full Submission Webhook Payload:", JSON.stringify(payload, null, 2))

    // record is the NEW state, old_record is the PREVIOUS state
    const record = payload.record
    const old_record = payload.old_record

    // 1. Logic check: Trigger on FIRST submission OR on re-submission after correction
    // First submission: 'actual' was null, now has a value
    const isFirstSubmission = !old_record?.actual && record.actual

    // Re-submission: status was 'pending' (Needs Correction), now 'pending_approval' (Submitted)
    const isResubmission = old_record?.status === 'pending' && record.status === 'pending_approval'

    if (!isFirstSubmission && !isResubmission) {
      console.log("Skipping: Not a new submission or re-submission after correction")
      return new Response(JSON.stringify({ message: "Skipping" }), { status: 200 })
    }

    // 3. Logic check: ONLY for 'one-time' tasks as requested
    if (record.freq !== 'one-time') {
      console.log(`Skipping: Frequency is '${record.freq}', not 'one-time'`)
      return new Response(JSON.stringify({ message: `Skipping: Frequency is '${record.freq}'` }), { status: 200 })
    }

    // 4. Check for Assigner WhatsApp Number in the record
    if (!record.assigner_whatsapp_no) {
      console.error(`No assigner_whatsapp_no found in record for task: ${record.id}`)
      return new Response(JSON.stringify({ error: "No assigner whatsapp number in task record" }), { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 5. Fetch Doer's Username (Removed password lookup)
    const { data: doerUserData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('full_name', record.name)
      .single()

    const doerUsername = doerUserData?.username || "N/A"
    const assignerName = record.given_by_username || "Assigner"

    // 6. Prepare WhatsApp Message
    const cleanNumber = record.assigner_whatsapp_no.toString().replace(/\D/g, '')
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`

    console.log(`Sending REVERT notification to Assigner: ${assignerName} (${fullNumber})`)

    if (!WHATSAPP_ENDPOINT || !WHATSAPP_ACCESS_TOKEN) {
      console.error("Error: Missing WhatsApp credentials")
      throw new Error("Meta API configuration missing")
    }

    // Format submission date for message (e.g., 2026-04-07)
    const subDate = record.actual ? new Date(record.actual).toLocaleDateString('en-IN') : 'N/A'

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
          name: "one_time_task_revert",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: assignerName },             // {{1}} Assigner Name
                { type: "text", text: record.name },              // {{2}} Doer Name
                { type: "text", text: record.task_title },        // {{3}} Task Title
                { type: "text", text: record.task_description || 'N/A' }, // {{4}} Task Desc
                { type: "text", text: record.department || 'N/A' }, // {{5}} Dept
                { type: "text", text: subDate },                  // {{6}} Submission Date
                { type: "text", text: record.remarks || 'No remarks' } // {{7}} Remarks
              ]
            }
          ]
        }
      }),
    })

    const result = await response.json()
    console.log("WhatsApp API Result:", result)

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
