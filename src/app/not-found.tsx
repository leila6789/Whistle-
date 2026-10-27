import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <p className="font-display text-sm uppercase tracking-[0.16em]">Whistle</p>
      <h1 className="font-display mt-2 text-4xl font-semibold uppercase">That page is not on the board.</h1>
      <Link href="/" className="mt-4 text-sm underline underline-offset-4">
        Back to the games
      </Link>
    </div>
  );
}
