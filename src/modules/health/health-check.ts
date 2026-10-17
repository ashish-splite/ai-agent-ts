export interface HealthCheck {
  readonly name: string;
  /** Resolves when healthy; rejects with the failure reason otherwise. */
  check(): Promise<void>;
}
