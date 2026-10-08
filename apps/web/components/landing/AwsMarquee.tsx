"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function AwsMarquee({ className }: { className?: string }) {
  return (
    <section className={cn("py-8 border-t border-[var(--border)] bg-[var(--bg-1)] overflow-hidden", className)}>
      <div className="flex items-center gap-12 opacity-40 w-max animate-[marquee_40s_linear_infinite] px-8 hover:opacity-70 transition-opacity">
        {/* We double the items to create a seamless loop */}
        {[1, 2].map((group) => (
          <React.Fragment key={group}>
            <span className="text-xl font-bold font-sans tracking-widest text-[#FF9900]">AWS</span>
            <span className="text-sm font-medium">Strands Agents SDK</span>
            <span className="text-sm font-medium">Bedrock</span>
            <span className="text-sm font-medium">Lambda</span>
            <span className="text-sm font-medium">API Gateway</span>
            <span className="text-sm font-medium">DynamoDB</span>
            <span className="text-sm font-medium">EventBridge</span>
            <span className="text-sm font-medium">Amplify</span>
            <span className="text-sm font-medium">CloudWatch</span>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
