import { cn } from "@/lib/utils";

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      aria-hidden
    >
      <rect width="32" height="32" fill="#1c140c" />
      <path
        d="M7 16c0-3 3.2-5 7-5 2.4 0 4.2.8 5.4 2.2L22 11.2c.4-.5 1.2-.2 1.2.5v8.6c0 .7-.8 1-1.2.5l-2.6-2.1C18.2 20.2 16.2 21 13.8 21 10 21 7 19 7 16Z"
        fill="#f4efe4"
      />
      <circle cx="12.2" cy="16" r="1.3" fill="#1c140c" />
    </svg>
  );
}
