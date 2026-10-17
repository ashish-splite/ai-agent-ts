import type { Redis } from "ioredis";
import type { Appointment } from "../../modules/appointments/appointment.ts";
import type { AppointmentRepository } from "../../modules/appointments/appointment.repository.ts";

const KEY_PREFIX = "appointment:";
const INDEX_KEY = "appointments";

export class RedisAppointmentRepository implements AppointmentRepository {
  constructor(private readonly client: Redis) {}

  async save(appointment: Appointment): Promise<Appointment> {
    await this.client
      .multi()
      .set(this.key(appointment.id), JSON.stringify(appointment))
      .zadd(
        INDEX_KEY,
        new Date(appointment.scheduledAt).getTime(),
        appointment.id,
      )
      .exec();
    return appointment;
  }

  async findById(id: string): Promise<Appointment | null> {
    const value = await this.client.get(this.key(id));
    return value ? (JSON.parse(value) as Appointment) : null;
  }

  async listAll(): Promise<Appointment[]> {
    const ids = await this.client.zrange(INDEX_KEY, 0, -1);
    if (ids.length === 0) return [];

    const values = await this.client.mget(ids.map((id) => this.key(id)));
    return values
      .filter((value): value is string => value !== null)
      .map((value) => JSON.parse(value) as Appointment);
  }

  private key(id: string): string {
    return `${KEY_PREFIX}${id}`;
  }
}
