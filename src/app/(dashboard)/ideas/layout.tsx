import { SectionSubNav } from "@/components/layout/section-sub-nav";

const PLAN_NAV = [
  { label: "Goals", href: "/goals" },
  { label: "Ideas", href: "/ideas" },
  { label: "Notes", href: "/notes" },
  { label: "Calendar", href: "/calendar" },
];

export default function IdeasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionSubNav items={PLAN_NAV} desktopHidden />
      {children}
    </div>
  );
}
