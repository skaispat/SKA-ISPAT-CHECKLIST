import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const WHATSAPP_ENDPOINT = Deno.env.get('WHATSAPP_ENDPOINT')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Rejection Webhook Payload:", JSON.stringify(payload, null, 2))

    // record is the NEW state, old_record is the PREVIOUS state
    const record = payload.record
    const old_record = payload.old_record

    // 1. Status Change Detection
    // Trigger when status moves TO 'rejected'
    const isRejection = record.status === 'rejected' && old_record?.status !== 'rejected'

    if (!isRejection) {
      console.log(`Skipping: No relevant status change (${old_record?.status} -> ${record.status})`)
      return new Response(JSON.stringify({ message: "No relevant status change" }), { status: 200 })
    }

    if (!record.whatsapp_no) {
      console.error("Missing whatsapp_no in record")
      return new Response(JSON.stringify({ error: "Missing whatsapp_no" }), { status: 400 })
    }

    // Prepare display values for template
    const assignerName = record.given_by_username || "Admin"
    const rejectionReason = record.admin_remark || "Task was rejected. Please review."

    // Prepare Phone Number
    const cleanNumber = record.whatsapp_no.toString().replace(/\D/g, '')
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`

    console.log(`Sending Rejection Update to Doer: ${record.name} (${fullNumber})`)

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
          name: "rejected_task", // The template name you mentioned
          language: { code: "en" }, // Adjust language code if your template uses a different one
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: record.name },                                     // {{1}} Hello {name}
                { type: "text", text: record.name },                                     // {{2}} User: {name/username}
                { type: "text", text: record.task_title },                               // {{3}} Task
                { type: "text", text: record.task_description || 'N/A' },                // {{4}} Description
                { type: "text", text: record.department || 'N/A' },                      // {{5}} Department
                { type: "text", text: record.task_start_date?.split('T')[0] || 'N/A' },  // {{6}} Start Date
                { type: "text", text: record.given_by_username || "admin" },             // {{7}} Rejected By
                { type: "text", text: rejectionReason }                                  // {{8}} Remarks
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
