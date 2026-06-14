import { SectionSubNav } from "@/components/layout/section-sub-nav";

const PLAN_NAV = [
  { label: "Calendar", href: "/calendar" },
  { label: "Content", href: "/content" },
  { label: "Ideas", href: "/ideas" },
];

export default function IdeasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionSubNav items={PLAN_NAV} />
      {children}
    </div>
  );
}
