import { SectionSubNav } from "@/components/layout/section-sub-nav";

const PLAN_NAV = [
  { label: "Calendar", href: "/calendar" },
  { label: "Content", href: "/content" },
  { label: "Ideas", href: "/ideas" },
  { label: "Notes", href: "/notes" },
];

export default function CalendarLayout({
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
