/**
 * Cloudflare Email Worker for Finandance.
 *
 * Receives emails sent to *@ingest.andrami.pro via Cloudflare Email Routing,
 * parses them with postal-mime, and forwards the content to the Finandance
 * backend webhook for transaction extraction.
 */

import PostalMime from "postal-mime";

interface Env {
  BACKEND_URL: string;
  WEBHOOK_SECRET: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const rawEmail = await streamToArrayBuffer(message.raw);
    const parser = new PostalMime();
    const parsed = await parser.parse(rawEmail);

    const payload = {
      from: message.from,
      to: message.to,
      subject: parsed.subject || "",
      date: parsed.date || new Date().toISOString(),
      message_id: parsed.messageId || `cf-${Date.now()}`,
      text_body: parsed.text || "",
      html_body: parsed.html || "",
    };

    const response = await fetch(
      `${env.BACKEND_URL}/api/v1/webhooks/inbound-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": env.WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `Webhook failed: ${response.status} ${response.statusText}`,
        body
      );
      // Reject the email so Cloudflare retries later
      message.setReject(`Backend returned ${response.status}`);
    } else {
      console.log(
        `Processed email from=${message.from} to=${message.to} subject="${payload.subject}"`
      );
    }
  },
};

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}
