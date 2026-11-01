export interface Appointment {
  id: number;
  serviceId: number;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  /** Salon-local date as YYYY-MM-DD. */
  date: string;
  /** Salon-local hour the 1-hour slot starts at. */
  startHour: number;
  createdAt: string;
}

export interface NewAppointment {
  serviceId: number;
  customerName: string;
  customerEmail: string;
  date: string;
  startHour: number;
}

export interface AvailabilitySlot {
  startHour: number;
  label: string;
  available: boolean;
}

export interface Availability {
  date: string;
  open: boolean;
  slots: AvailabilitySlot[];
}
