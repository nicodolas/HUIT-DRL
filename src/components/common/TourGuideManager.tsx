"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WelcomeTourModal } from "@/components/common/WelcomeTourModal";
import { startHuitTour, isTourSeen, setTourSeen } from "@/lib/tour/tourConfig";

export const TourGuideManager: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    // Give modal a tiny fraction to close before highlighting DOM element
    setTimeout(() => {
      startHuitTour();
    }, 100);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowWelcome(false);
    setTourSeen();
  }, []);

  useEffect(() => {
    // 1. If user hasn't seen the tour yet, present the friendly welcome dialog after 800ms
    let timer: NodeJS.Timeout | undefined;
    if (!isTourSeen()) {
      timer = setTimeout(() => {
        setShowWelcome(true);
      }, 800);
    }

    // 2. Global event listener for manual tour triggers across all pages/buttons
    const handleTriggerTour = () => {
      setShowWelcome(false);
      startHuitTour();
    };

    window.addEventListener("huit:start-tour", handleTriggerTour);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("huit:start-tour", handleTriggerTour);
    };
  }, []);

  return (
    <WelcomeTourModal
      isOpen={showWelcome}
      onStartTour={handleStartTour}
      onDismiss={handleDismiss}
    />
  );
};

