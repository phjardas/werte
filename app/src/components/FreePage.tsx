import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { createTest } from "../api";
import { HeroLogo } from "./Logo";

export function FreePage() {
  const created = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (created.current) return;
    created.current = true;

    createTest().then((testId) => {
      navigate({
        to: `/tests/$testId`,
        params: { testId },
        replace: true,
      });
    });
  }, []);

  return (
    <div className="screen active step-pending">
      <div className="pending-container">
        <HeroLogo />
        <>
          <span className="spinner spinner-lg" />
          <p className="pending-message">
            Dein persönlicher Test wird vorbereitet…
          </p>
        </>
      </div>
    </div>
  );
}
