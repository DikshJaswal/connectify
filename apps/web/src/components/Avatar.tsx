import { Bot } from "lucide-react";

type Props = {
  name: string;
  src?: string;
  ai?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl"
};

export function Avatar({ name, src, ai, size = "md" }: Props) {
  if (src && !src.startsWith("local://")) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ring-1 ring-blue-100`} />;
  }

  return (
    <div className={`${sizes[size]} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-200/60`}>
      {ai ? <Bot className="h-5 w-5" /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}
