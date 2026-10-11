import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  priority?: boolean;
  href?: string;
}

export function Logo({
  size = 32,
  withWordmark = false,
  className,
  priority = false,
  href,
}: LogoProps) {
  const borderRadius = Math.round(size * 0.22);

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: `${borderRadius}px`,
        }}
        className="relative overflow-hidden shrink-0 inline-flex items-center justify-center select-none"
      >
        <Image
          src="/icon.jpeg"
          alt={withWordmark ? "" : "Saans"}
          aria-hidden={withWordmark ? true : undefined}
          width={size}
          height={size}
          priority={priority}
          className="w-full h-full object-cover"
        />
      </span>
      {withWordmark && (
        <span className="font-serif italic text-2xl tracking-tight text-[var(--text-hi)] select-none">
          Saans
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Saans home" className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
