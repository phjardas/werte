import { type ReactNode } from "react";

export function ErrorScreen({
  title,
  message,
}: {
  readonly title?: string;
  readonly message: ReactNode;
}) {
  return (
    <div className="screen active step-error">
      <div className="error-container">
        <h1>{title ?? "Fehler"}</h1>
        <div>{message}</div>
        <a href="/" className="btn btn-primary">
          Zur Startseite
        </a>
      </div>
    </div>
  );
}
