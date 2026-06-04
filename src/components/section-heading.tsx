export function SectionHeading({ title }: { title: string }) {
  return (
    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
      {title}
    </h1>
  );
}
