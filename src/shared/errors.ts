export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Resource not found") {
    super(message);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
