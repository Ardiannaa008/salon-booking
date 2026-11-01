const form = document.getElementById('booking-form');
const bookingSection = document.getElementById('booking-section');
const servicesEl = document.getElementById('services');
const dateInput = document.getElementById('date');
const slotsEl = document.getElementById('slots');
const formError = document.getElementById('form-error');
const submitButton = document.getElementById('submit');
const confirmation = document.getElementById('confirmation');

let selectedHour = null;

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function showError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function showMessage(container, text) {
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = text;
  container.replaceChildren(p);
}

function localDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function loadServices() {
  try {
    const response = await fetch('/services');
    if (!response.ok) throw new Error();
    const { services } = await response.json();
    if (services.length === 0) {
      showMessage(servicesEl, 'No services are available yet.');
      return;
    }
    servicesEl.replaceChildren(...services.map(renderService));
  } catch {
    showMessage(servicesEl, 'Services could not be loaded. Please refresh the page.');
  }
}

function renderService(service) {
  const label = document.createElement('label');
  label.className = 'service';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'service';
  input.value = service.id;
  input.required = true;

  const text = document.createElement('span');
  text.className = 'service-text';
  const name = document.createElement('strong');
  name.textContent = service.name;
  const description = document.createElement('small');
  description.textContent = service.description;
  text.append(name, description);

  const price = document.createElement('span');
  price.className = 'price';
  price.textContent = money.format(service.priceCents / 100);

  label.append(input, text, price);
  return label;
}

async function loadSlots() {
  selectedHour = null;
  const date = dateInput.value;
  if (!date) {
    showMessage(slotsEl, 'Choose a day to see free times.');
    return;
  }

  showMessage(slotsEl, 'Loading times…');
  try {
    const response = await fetch(`/availability?date=${encodeURIComponent(date)}`);
    if (!response.ok) throw new Error();
    const availability = await response.json();
    // Ignore this answer if the customer has picked another day in the meantime.
    if (date !== dateInput.value) return;

    if (!availability.open) {
      showMessage(slotsEl, 'The salon isn\'t taking bookings for this day. Please choose another one.');
    } else if (!availability.slots.some((slot) => slot.available)) {
      showMessage(slotsEl, 'This day is fully booked. Please choose another one.');
    } else {
      slotsEl.replaceChildren(...availability.slots.map(renderSlot));
    }
  } catch {
    showMessage(slotsEl, 'Times could not be loaded. Please try again.');
  }
}

function renderSlot(slot) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'slot';
  button.textContent = slot.label;
  button.disabled = !slot.available;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    selectedHour = slot.startHour;
    for (const other of slotsEl.querySelectorAll('.slot')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
  });
  return button;
}

function validate(serviceId) {
  if (!serviceId) return 'Please choose a service.';
  if (!dateInput.value) return 'Please choose a day.';
  if (selectedHour === null) return 'Please choose a time.';
  if (form.elements.name.value.trim().length < 2) return 'Please enter your name.';
  if (!form.elements.email.checkValidity() || !form.elements.email.value) return 'Please enter a valid email address.';
  return '';
}

function describeApiError(status, body) {
  if (body?.details?.[0]?.field === 'customerName') {
    return 'Please use only letters in your name.';
  }
  if (body?.details?.[0]?.field === 'customerEmail') {
    return 'Please enter a valid email address.';
  }
  return body?.error ?? (status >= 500 ? 'Something went wrong. Please try again.' : 'Please check your details.');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const serviceInput = form.querySelector('input[name="service"]:checked');
  const problem = validate(serviceInput?.value);
  showError(problem);
  if (problem) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Booking…';
  try {
    const response = await fetch('/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: Number(serviceInput.value),
        customerName: form.elements.name.value.trim(),
        customerEmail: form.elements.email.value.trim(),
        date: dateInput.value,
        startHour: selectedHour,
      }),
    });
    const body = await response.json().catch(() => null);

    if (response.ok) {
      showConfirmation(serviceInput);
      return;
    }
    showError(describeApiError(response.status, body));
    // Someone else took the slot, so show the updated times.
    if (response.status === 409) await loadSlots();
  } catch {
    showError('Could not reach the salon. Check your connection and try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Book appointment';
  }
});

function showConfirmation(serviceInput) {
  const serviceName = serviceInput.closest('.service').querySelector('strong').textContent;
  const day = new Date(`${dateInput.value}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const time = `${String(selectedHour).padStart(2, '0')}:00`;
  document.getElementById('confirmation-details').textContent =
    `${serviceName} on ${day} at ${time}. We'll email the details to ${form.elements.email.value.trim()}.`;

  bookingSection.hidden = true;
  confirmation.hidden = false;
  confirmation.focus();
}

document.getElementById('book-another').addEventListener('click', async () => {
  form.reset();
  selectedHour = null;
  showMessage(slotsEl, 'Choose a day to see free times.');
  showError('');
  confirmation.hidden = true;
  bookingSection.hidden = false;
});

dateInput.min = localDateString(new Date());
dateInput.addEventListener('change', loadSlots);
loadServices();
