import type { Appointment } from "../domain/appointment.ts";

export interface AppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findById(id: string): Promise<Appointment | null>;
  listAll(): Promise<Appointment[]>;
}
