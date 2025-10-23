import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-2b20b999/health", (c) => {
  return c.json({ status: "ok" });
});

// Endpoint pour récupérer toutes les réservations
app.get("/make-server-2b20b999/bookings", async (c) => {
  try {
    const bookings = await kv.getByPrefix("booking:");
    return c.json({ bookings: bookings || [] });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return c.json({ error: "Failed to fetch bookings", message: String(error) }, 500);
  }
});

// Endpoint pour sauvegarder une réservation
app.post("/make-server-2b20b999/bookings", async (c) => {
  try {
    const body = await c.req.json();
    const { id, date, hour, clientName, clientEmail } = body;

    if (!id || !date || hour === undefined || !clientName || !clientEmail) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const booking = { id, date, hour, clientName, clientEmail };
    await kv.set(`booking:${id}`, booking);

    return c.json({ success: true, booking });
  } catch (error) {
    console.error("Error saving booking:", error);
    return c.json({ error: "Failed to save booking", message: String(error) }, 500);
  }
});

// Endpoint pour envoyer un email de confirmation de réservation
app.post("/make-server-2b20b999/send-booking-email", async (c) => {
  try {
    const body = await c.req.json();
    const { clientName, clientEmail, date, slots } = body;

    if (!clientName || !clientEmail || !date || !slots || slots.length === 0) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return c.json({ error: "Email service not configured" }, 500);
    }

    // Formater les créneaux
    const slotsText = slots
      .sort((a: number, b: number) => a - b)
      .map((hour: number) => {
        const endHour = hour === 23 ? "0h" : hour === 1 ? "2h" : `${hour + 1}h`;
        return `${hour}h00 - ${endHour}00`;
      })
      .join("\n");

    // Envoyer l'email à spanazol@wanadoo.fr
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Réservations Les Gîtes du Soulor <onboarding@resend.dev>",
        to: ["spanazol@wanadoo.fr"],
        subject: `Nouvelle réservation Bain Nordique & Sauna - ${clientName}`,
        html: `
          <h2 style="color: #c9a66b;">Nouvelle réservation Bain Nordique & Sauna</h2>
          <p style="background-color: #f0f0f0; padding: 10px; border-left: 4px solid #c9a66b;">
            <strong>Services réservés:</strong> Bain Nordique + Sauna (réservation simultanée)
          </p>
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Email:</strong> ${clientEmail}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Créneaux réservés:</strong></p>
          <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 5px;">${slotsText}</pre>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            <em>Cette réservation est gratuite et comprise dans le prix du séjour.</em>
          </p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      return c.json({ error: "Failed to send email", details: errorData }, 500);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return c.json({ success: true, emailId: emailData.id });
  } catch (error) {
    console.error("Error in send-booking-email endpoint:", error);
    return c.json({ error: "Internal server error", message: String(error) }, 500);
  }
});

Deno.serve(app.fetch);