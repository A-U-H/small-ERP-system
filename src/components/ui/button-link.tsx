import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ButtonLink({
  href,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { href: string }) {
  return (
    <Button {...props} nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  );
}
