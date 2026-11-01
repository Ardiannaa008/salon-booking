import { formatDate, formatHour } from '../salonCalendar.js';

export interface ConfirmationDetails {
  salonName: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  startHour: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildConfirmationEmail(details: ConfirmationDetails) {
  const when = `${formatDate(details.date)} at ${formatHour(details.startHour)}`;
  const { salonName, customerName, serviceName } = details;

  return {
    to: details.customerEmail,
    subject: `Your ${salonName} appointment is confirmed`,
    bodyText: [
      `Hi ${customerName},`,
      '',
      `Your appointment at ${salonName} is confirmed.`,
      '',
      `Service: ${serviceName}`,
      `When: ${when}`,
      '',
      'See you soon!',
    ].join('\n'),
    bodyHtml: `
      <div style="font-family: Georgia, serif; max-width: 480px; color: #2b2320;">
        <h2 style="font-weight: normal;">Your appointment is confirmed</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>We're looking forward to seeing you at ${escapeHtml(salonName)}.</p>
        <p><strong>Service:</strong> ${escapeHtml(serviceName)}<br />
           <strong>When:</strong> ${escapeHtml(when)}</p>
      </div>`,
  };
}
