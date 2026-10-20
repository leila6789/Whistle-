import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#ff9a3c]">WHISTLE</p>
      <h1 className="mt-2 text-2xl font-semibold">That page is not on the board.</h1>
      <Link href="/" className="mt-4 text-sm text-[#ff9a3c]">
        Back to the games
      </Link>
    </div>
  );
}
