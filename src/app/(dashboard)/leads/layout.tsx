import { SectionSubNav } from "@/components/layout/section-sub-nav";

const GROW_NAV = [
  { label: "Leads", href: "/leads" },
  { label: "Content", href: "/content" },
];

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionSubNav items={GROW_NAV} desktopHidden />
      {children}
    </div>
  );
}
