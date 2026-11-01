// Used by both pages. The frontend only ever talks to the backend through the API.

const healthBadge = document.getElementById('health-badge');

async function refreshHealthBadge() {
  let healthy = false;
  try {
    const response = await fetch('/health');
    healthy = response.ok;
  } catch {
    healthy = false;
  }
  healthBadge.textContent = healthy ? 'All systems working' : 'Service problem';
  healthBadge.classList.toggle('badge-ok', healthy);
  healthBadge.classList.toggle('badge-bad', !healthy);
}

refreshHealthBadge();
setInterval(refreshHealthBadge, 30000);
