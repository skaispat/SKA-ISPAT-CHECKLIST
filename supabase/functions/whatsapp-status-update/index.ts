import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const WHATSAPP_ENDPOINT = Deno.env.get('WHATSAPP_ENDPOINT')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Status Update Webhook Payload:", JSON.stringify(payload, null, 2))

    // record is the NEW state, old_record is the PREVIOUS state
    const record = payload.record
    const old_record = payload.old_record

    // 1. Basic Filters
    if (record.freq !== 'one-time') {
      console.log("Skipping: Not a one-time task")
      return new Response(JSON.stringify({ message: "Skipping: Not a one-time task" }), { status: 200 })
    }

    // 2. Status Change Detection
    // Logic: Trigger when status moves FROM 'pending_approval' TO ('Yes' OR 'pending')
    const isApproval = old_record?.status === 'pending_approval' && record.status === 'Yes'
    const isCorrection = old_record?.status === 'pending_approval' && record.status === 'pending'

    if (!isApproval && !isCorrection) {
      console.log(`Skipping: No relevant status change (${old_record?.status} -> ${record.status})`)
      return new Response(JSON.stringify({ message: "No relevant status change" }), { status: 200 })
    }

    if (!record.whatsapp_no) {
      console.error("Missing whatsapp_no in record")
      return new Response(JSON.stringify({ error: "Missing whatsapp_no" }), { status: 400 })
    }

    // Prepare display values for template
    const statusText = isApproval ? "Approved" : "Needs Correction"
    const remarks = isApproval ? "Approved" : (record.admin_remark || "Please review the task details for corrections.")
    const assignerName = record.given_by_username || "Assigner"

    // Prepare Phone Number
    const cleanNumber = record.whatsapp_no.toString().replace(/\D/g, '')
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`

    console.log(`Sending Status Update: ${statusText} to Doer: ${record.name} (${fullNumber})`)

    if (!WHATSAPP_ENDPOINT || !WHATSAPP_ACCESS_TOKEN) {
      console.error("Missing WhatsApp credentials")
      throw new Error("Meta API configuration missing in environment variables")
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
          name: "one_time_task_status_update",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: record.name },                         // {{1}} Doer Name
                { type: "text", text: assignerName },                       // {{2}} Updated By (Assigner)
                { type: "text", text: statusText },                         // {{3}} Status (Approved/Correction)
                { type: "text", text: record.task_title },                  // {{4}} Task Title
                { type: "text", text: record.task_description || 'N/A' },   // {{5}} Description
                { type: "text", text: record.department || 'N/A' },         // {{6}} Department
                { type: "text", text: remarks }                             // {{7}} Remarks
              ]
            }
          ]
        }
      }),
    })

    const result = await response.json()
    console.log("WhatsApp API Response:", JSON.stringify(result, null, 2))

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
