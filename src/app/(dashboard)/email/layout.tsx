import { SectionSubNav } from "@/components/layout/section-sub-nav";

const SOCIAL_NAV = [{ label: "Email", href: "/email" }];

export default function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionSubNav items={SOCIAL_NAV} desktopHidden />
      {children}
    </div>
  );
}
