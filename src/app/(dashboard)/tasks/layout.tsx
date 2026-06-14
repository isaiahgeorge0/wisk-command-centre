import { SectionSubNav } from "@/components/layout/section-sub-nav";

const WORK_NAV = [
  { label: "Projects", href: "/projects" },
  { label: "Tasks", href: "/tasks" },
  { label: "Goals", href: "/goals" },
];

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionSubNav items={WORK_NAV} />
      {children}
    </div>
  );
}
