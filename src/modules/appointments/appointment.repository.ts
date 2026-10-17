import type { Appointment } from "./appointment.ts";

export interface AppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findById(id: string): Promise<Appointment | null>;
  listAll(): Promise<Appointment[]>;
}
