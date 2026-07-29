// Thrown inside a `mutateDb` callback to bubble a specific HTTP status and
// message out to the route handler.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
