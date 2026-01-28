/**
 * Cloudflare Worker for genaiqueen.com contact form
 *
 * Setup instructions:
 * 1. Create a new Worker in Cloudflare dashboard
 * 2. Copy this code into the Worker
 * 3. Set up environment variables:
 *    - SENDGRID_API_KEY: Your SendGrid API key
 *    - RECIPIENT_EMAIL: Email to receive form submissions (e.g., lana@genaiqueen.com)
 * 4. Optional: Set up Cloudflare KV namespace for storing submissions
 *    - Create KV namespace called "FORM_SUBMISSIONS"
 *    - Bind it to the Worker
 * 5. Configure route: genaiqueen.com/api/* -> this Worker
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only accept POST requests to /api/contact
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact' || request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    try {
      const formData = await request.json();

      // Validate required fields
      const required = ['name', 'email', 'business', 'tier', 'message'];
      for (const field of required) {
        if (!formData[field]) {
          return new Response(
            JSON.stringify({ error: `Missing required field: ${field}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email address' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Format the email content
      const tierLabels = {
        'tier1': 'Tier 1: Traditional Visibility ($1,500)',
        'tier2': 'Tier 2: AI Recommendation ($3,000)',
        'tier3': 'Tier 3: Omnipresence ($5,000)',
        'not-sure': 'Not sure yet',
      };

      const emailBody = `
New GEO inquiry from genaiqueen.com

Name: ${formData.name}
Email: ${formData.email}
Business/Website: ${formData.business}
Phone: ${formData.phone || 'Not provided'}
Interested In: ${tierLabels[formData.tier] || formData.tier}

Message:
${formData.message}

---
Submitted at: ${new Date().toISOString()}
      `.trim();

      // Store in KV if available (backup/record keeping)
      if (env.FORM_SUBMISSIONS) {
        const submissionId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await env.FORM_SUBMISSIONS.put(submissionId, JSON.stringify({
          ...formData,
          submittedAt: new Date().toISOString(),
        }));
      }

      // Send email via SendGrid
      if (env.SENDGRID_API_KEY && env.RECIPIENT_EMAIL) {
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: env.RECIPIENT_EMAIL }],
              subject: `New GEO Inquiry from ${formData.name}`,
            }],
            from: {
              email: 'noreply@genaiqueen.com',
              name: 'genaiqueen.com'
            },
            reply_to: {
              email: formData.email,
              name: formData.name
            },
            content: [{
              type: 'text/plain',
              value: emailBody,
            }],
          }),
        });

        if (!sendGridResponse.ok) {
          console.error('SendGrid error:', await sendGridResponse.text());
          // Don't fail the request if email fails but KV storage worked
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Form submitted successfully' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );

    } catch (error) {
      console.error('Form submission error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to process form submission' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
