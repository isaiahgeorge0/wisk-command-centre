import { PAGE_TITLE_CLASS } from "@/lib/navigation";

export function SectionHeading({ title }: { title: string }) {
  return <h1 className={PAGE_TITLE_CLASS}>{title}</h1>;
}
