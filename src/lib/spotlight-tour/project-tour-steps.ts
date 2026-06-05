export type ProjectTourStep = {
  target: string;
  title: string;
  body: string;
  cta: string;
};

export const PROJECT_TOUR_STEPS: ProjectTourStep[] = [
  {
    target: "add-project",
    title: "Start here",
    body: "Click the button to add your first project. We'll walk you through each field.",
    cta: "Got it",
  },
  {
    target: "client-name",
    title: "Who is this for?",
    body: "Enter your client's name or the name of the project. This is how it will appear across your command centre.",
    cta: "Next",
  },
  {
    target: "service-type",
    title: "What type of work?",
    body: "Choose the project type you are providing. You can add your own project types in Settings at any time.",
    cta: "Next",
  },
  {
    target: "status",
    title: "Where are things right now?",
    body: "Set the current status of this project. Update it as the project progresses — Active, Paused, Completed.",
    cta: "Next",
  },
  {
    target: "next-action",
    title: "What happens next?",
    body: "The single most important thing that needs to happen on this project. Keeping this updated helps you stay focused.",
    cta: "Next",
  },
  {
    target: "deadline-value",
    title: "The details that matter",
    body: "Set a deadline to stay on track and log the project value to build your revenue picture over time. Both are optional.",
    cta: "Add my project",
  },
];

export const PROJECT_TOUR_STEP_COUNT = PROJECT_TOUR_STEPS.length;

export const PROJECT_TOUR_FORM_ID = "add-project-form";

export const SPOTLIGHT_STEP_TRANSITION_MS = 150;
