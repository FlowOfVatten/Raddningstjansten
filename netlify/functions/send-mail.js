// Netlify Function: send-mail
// Sends an email notification to the organizer when someone signs up.
//
// Required environment variable (set in Netlify > Site settings > Environment variables):
//   RESEND_API_KEY  — your API key from https://resend.com
//
// Optional environment variable:
//   RESEND_FROM_EMAIL — verified sender address, e.g. "Uppsala Brandförsvar <noreply@yourdomain.se>"
//                       If not set, defaults to the Resend test sender "onboarding@resend.dev"
//                       NOTE: onboarding@resend.dev can only send to addresses you verify in Resend.
//                       For production, verify your own domain at resend.com and set this variable.

exports.handler = async function handleSendMail(event) {
  console.log('send-mail invoked, method:', event.httpMethod);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not set, skipping');
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY not set' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
    console.log('Payload received, organizerEmail:', payload.organizerEmail, 'signer:', payload.signerName);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { organizerEmail, signerName, signerStation, eventTitle, sessionDate, sessionLocation, sessionTime, type } = payload;

  if (!organizerEmail || !signerName || !eventTitle) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(organizerEmail)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid organizer email address' }) };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const isCancellation = type === 'avbokad';
  const headerColor = isCancellation ? '#888' : '#e73137';
  const headerLabel = isCancellation ? 'Avbokning' : 'Ny anmälan';
  const subjectPrefix = isCancellation ? 'Avbokning' : 'Ny anmälan';

  const html = `
    <div style="font-family:sans-serif;max-width:520px;color:#222">
      <div style="background:${headerColor};padding:16px 24px;border-radius:6px 6px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">${headerLabel}</h2>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:0;padding:20px 24px;border-radius:0 0 6px 6px">
        <p style="margin:0 0 8px"><strong>Övning:</strong> ${escapeHtml(eventTitle)}</p>
        <p style="margin:0 0 8px"><strong>Datum:</strong> ${escapeHtml(sessionDate)}</p>
        <p style="margin:0 0 8px"><strong>Ort:</strong> ${escapeHtml(sessionLocation)}</p>
        <p style="margin:0 0 16px"><strong>Tid:</strong> ${escapeHtml(sessionTime)}</p>
        <hr style="border:0;border-top:1px solid #e0e0e0;margin:0 0 16px">
        <p style="margin:0 0 8px"><strong>Namn:</strong> ${escapeHtml(signerName)}</p>
        <p style="margin:0"><strong>Station:</strong> ${escapeHtml(signerStation)}</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: organizerEmail,
        subject: `${subjectPrefix}: ${eventTitle} – ${signerName}`,
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', response.status, errorText);
      return { statusCode: 200, body: JSON.stringify({ error: 'Mail delivery failed', resend: errorText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-mail error:', err);
    return { statusCode: 200, body: JSON.stringify({ error: 'Mail delivery failed' }) };
  }
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
