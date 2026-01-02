"use client";

import { StrengthSessionForm, StrengthTemplate } from "@/components/StrengthSessionForm";
import { KettlebellSessionForm } from "@/components/KettlebellSessionForm";
import { RideSessionForm } from "@/components/RideSessionForm";
import { CheckinForm } from "@/components/CheckinForm";

const strengthA: StrengthTemplate = {
  title: "Strength A",
  description: "Squat-light, pull-heavy. Leave ~2 reps in reserve.",
  lifts: [
    { lift: "squat", label: "Back Squat", sets: 3, reps: 5 },
    { lift: "bench", label: "Bench Press", sets: 5, reps: 5 },
    { lift: "row", label: "Barbell Row", sets: 4, reps: 6 },
    { lift: "pullups", label: "Chin-ups / Pull-ups", sets: 3, reps: 8, isOptional: true }
  ]
};

const strengthB: StrengthTemplate = {
  title: "Strength B",
  description: "Hinge-heavy, press-focused.",
  lifts: [
    { lift: "deadlift", label: "Deadlift (1 heavy + 2 back-off)", sets: 3, reps: 5 },
    { lift: "ohp", label: "Overhead Press", sets: 5, reps: 3 },
    { lift: "split_squat", label: "Bulgarian Split Squat", sets: 3, reps: 8 },
    { lift: "hip_thrust", label: "Hip Thrusts", sets: 3, reps: 8, isOptional: true }
  ]
};

export default function LogPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-2">
        <StrengthSessionForm template={strengthA} />
        <StrengthSessionForm template={strengthB} />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <KettlebellSessionForm />
        <RideSessionForm />
      </section>
      <CheckinForm />
    </div>
  );
}
