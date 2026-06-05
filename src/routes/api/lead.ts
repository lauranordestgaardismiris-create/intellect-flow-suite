import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LeadSchema = z.object({
  email: z.string().email().max(255),
  company_size: z.string().min(1).max(50),
  role: z.string().min(1).max(100),
});

const NOTIFY_TO = "laura.nordestgaard.ismiris@gmail.com";

export const Route = createFileRoute("/api/lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        const parsed = LeadSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        const { email, company_size, role } = parsed.data;

        const { error: dbError } = await supabaseAdmin.from("leads").insert({ email, company_size, role });
        if (dbError) {
          return new Response(JSON.stringify({ error: "Could not save submission" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        // Best-effort email notification via Supabase pgmq queue if email infra is configured.
        try {
          await supabaseAdmin.rpc("enqueue_email" as never, {
            queue_name: "transactional_emails",
            payload: {
              to: NOTIFY_TO,
              subject: "CI Platform — New Interest Submission",
              html: `<h2>New lead submitted</h2><ul><li><strong>Email:</strong> ${email}</li><li><strong>Company size:</strong> ${company_size}</li><li><strong>Role:</strong> ${role}</li></ul>`,
              text: `New lead:\nEmail: ${email}\nCompany size: ${company_size}\nRole: ${role}`,
            },
          } as never);
        } catch {
          // Email infra not configured yet; lead is still saved to database.
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
