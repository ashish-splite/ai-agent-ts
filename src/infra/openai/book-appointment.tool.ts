import type { Appointment } from "../../modules/appointments/appointment.ts";
import type { AppointmentRepository } from "../../modules/appointments/appointment.repository.ts";
import type { AgentTool } from "./tools.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLOT_HOURS = [9, 10, 11, 12, 14, 15, 16, 17];

/** Picks a random slot on the day after today. */
function nextDaySlot(): Date {
  const slot = new Date();
  slot.setDate(slot.getDate() + 1);
  slot.setHours(
    SLOT_HOURS[Math.floor(Math.random() * SLOT_HOURS.length)] ?? 10,
    0,
    0,
    0,
  );
  return slot;
}

export function createBookAppointmentTool(
  repository: AppointmentRepository,
): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Book an appointment with Ashish. Call this only after collecting " +
          "the visitor's name, age, email, purpose, whether they have met " +
          "Ashish before, and their preferred timing.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Visitor's full name." },
            age: { type: "number", description: "Visitor's age in years." },
            email: {
              type: "string",
              description: "Visitor's email address for the confirmation.",
            },
            purpose: {
              type: "string",
              description: "Why they want to meet Ashish.",
            },
            metBefore: {
              type: "boolean",
              description: "Whether the visitor has met Ashish before.",
            },
            preferredTiming: {
              type: "string",
              description:
                "Visitor's preferred timing in their own words, e.g. 'tomorrow morning'.",
            },
          },
          required: [
            "name",
            "age",
            "email",
            "purpose",
            "metBefore",
            "preferredTiming",
          ],
          additionalProperties: false,
        },
      },
    },

    handler: async (args) => {
      const name = typeof args.name === "string" ? args.name.trim() : "";
      const age = typeof args.age === "number" ? args.age : Number(args.age);
      const email =
        typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
      const purpose =
        typeof args.purpose === "string" ? args.purpose.trim() : "";
      const preferredTiming =
        typeof args.preferredTiming === "string"
          ? args.preferredTiming.trim()
          : "";
      const metBefore = args.metBefore === true;

      if (!name) return "Error: 'name' is required.";
      if (!Number.isFinite(age) || age < 1 || age > 120) {
        return "Error: 'age' must be a number between 1 and 120.";
      }
      if (!EMAIL_PATTERN.test(email)) {
        return "Error: 'email' must be a valid email address.";
      }
      if (!purpose) return "Error: 'purpose' is required.";
      if (!preferredTiming) return "Error: 'preferredTiming' is required.";

      const scheduledAt = nextDaySlot();
      const appointment: Appointment = {
        id: crypto.randomUUID(),
        name,
        age,
        email,
        purpose,
        metBefore,
        preferredTiming,
        scheduledAt: scheduledAt.toISOString(),
        createdAt: new Date().toISOString(),
      };

      try {
        await repository.save(appointment);
      } catch (error) {
        console.error("[agent] book_appointment failed", error);
        return "Error: the appointment could not be saved.";
      }

      return JSON.stringify({
        appointmentId: appointment.id,
        scheduledAt: appointment.scheduledAt,
        readableTime: scheduledAt.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        name,
        email,
        purpose,
      });
    },
  };
}
