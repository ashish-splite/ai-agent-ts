import type { AppointmentRepository } from "../ports/appointment-repository.ts";
import type { Mailer } from "../ports/mailer.ts";
import { createBookAppointmentTool } from "./book-appointment.tool.ts";
import { createSendEmailTool } from "./send-email.tool.ts";
import { AgentToolRegistry } from "./tools.ts";

export interface AgentToolDependencies {
  mailer: Mailer;
  mailAllowedRecipients: string[];
  appointmentRepository: AppointmentRepository;
}

/** Single place where every tool available to the agent is registered. */
export function createAgentToolRegistry(
  deps: AgentToolDependencies,
): AgentToolRegistry {
  return new AgentToolRegistry([
    createSendEmailTool(deps.mailer, deps.mailAllowedRecipients),
    createBookAppointmentTool(deps.appointmentRepository),
  ]);
}
