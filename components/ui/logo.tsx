import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

interface LogoProps {
  href?:          string;
  size?:          "sm" | "md" | "lg";
  showText?:      boolean;
  className?:     string;
  textClassName?: string;
  light?:         boolean;
}

const sizes = {
  sm: { img: 28,  text: "text-base",  sub: "text-[10px]" },
  md: { img: 36,  text: "text-lg",    sub: "text-[11px]" },
  lg: { img: 48,  text: "text-2xl",   sub: "text-xs"     },
};

export function Logo({
  href       = "/",
  size       = "md",
  showText   = true,
  className,
  textClassName,
  light      = false,
}: LogoProps) {
  const s = sizes[size];

  const inner = (
    <span className={cn("flex items-center gap-2.5", className)}>
      {/* Gunakan logo PNG asli dari aset */}
      <Image
        src={BRAND.logoPng}
        alt={`${BRAND.name} logo`}
        width={s.img}
        height={s.img}
        priority
        className="object-contain flex-shrink-0"
        unoptimized
      />
      {showText && (
        <span className={cn("flex flex-col leading-tight", textClassName)}>
          <span className={cn(
            s.text, "font-extrabold tracking-tight",
            light ? "text-white" : "text-[#8B0000]"
          )}>
            {BRAND.name}
          </span>
          {size === "lg" && (
            <span className={cn(
              s.sub, "font-medium",
              light ? "text-white/70" : "text-slate-500"
            )}>
              {BRAND.taglineShort}
            </span>
          )}
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} className="focus-visible:outline-none">
      {inner}
    </Link>
  ) : inner;
}
