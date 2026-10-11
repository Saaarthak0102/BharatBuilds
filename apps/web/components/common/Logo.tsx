'use client';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/useSession";

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
  href = "/",
}: LogoProps) {
  const { session } = useSession();
  const borderRadius = Math.round(size * 0.22);
  const [resolvedHref, setResolvedHref] = React.useState(href);

  React.useEffect(() => {
    let dashboardPath: string | null = null;
    if (session?.role === 'farmer') {
      dashboardPath = '/farmer';
    } else if (session?.role === 'citizen') {
      dashboardPath = '/citizen';
    } else if (typeof window !== 'undefined') {
      const demoRole = localStorage.getItem('saans_demo');
      if (demoRole === 'farmer') dashboardPath = '/farmer';
      else if (demoRole === 'citizen') dashboardPath = '/citizen';
    }

    if (dashboardPath && (href === '/' || !href)) {
      setResolvedHref(dashboardPath);
    } else {
      setResolvedHref(href || '/');
    }
  }, [session, href]);

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

  return (
    <Link href={resolvedHref} aria-label="Saans home" className="inline-flex items-center cursor-pointer">
      {content}
    </Link>
  );
}
