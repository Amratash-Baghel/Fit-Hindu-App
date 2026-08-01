/**
 * Panel shell: verifies the signed-in user is an ADMIN (admin_users row via
 * rpc is_admin) and renders the two-area nav — Library | Compose (decision
 * 2026-07-13). Non-admins get the "ask the owner" screen, not the panel.
 */
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { supabaseConfigured, MISSING_ENV_MESSAGE } from "@/lib/config";

/** Rendered instead of a 500 when the deploy is missing its env vars. */
function ConfigError() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-lg p-8">
        <h1 className="text-lg font-bold" style={{ color: "var(--danger)" }}>
          Setup incomplete
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {MISSING_ENV_MESSAGE}
        </p>
      </div>
    </main>
  );
}

const NAV = [
  {
    area: "Library",
    hint: "atomic content — add & edit",
    items: [
      { href: "/library/exercises", label: "Exercises" },
      { href: "/library/sounds", label: "Sounds" },
      { href: "/library/meals", label: "Meals" },
      { href: "/library/mantras", label: "Mantras" },
    ],
    soon: ["Devotional"],
  },
  {
    area: "Compose",
    hint: "assemble library items",
    items: [{ href: "/compose/workouts", label: "Workouts" }],
    soon: ["Diet days", "Programs", "Calendar"],
  },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured()) return <ConfigError />;

  const supabase = await supabaseServer();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-lg font-bold">Not an admin yet</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Your account is signed in but isn&apos;t on the admin list. Ask the
            owner to add you (Supabase → admin_users), then reload.
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex w-56 shrink-0 flex-col border-r p-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <Link href="/" className="mb-6 block">
          <span className="text-xs font-bold uppercase tracking-[3px]" style={{ color: "var(--gold)" }}>
            Fit Hindu
          </span>
          <span className="block text-sm font-semibold">Content Panel</span>
        </Link>

        {NAV.map((section) => (
          <div key={section.area} className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--saffron)" }}>
              {section.area}
            </div>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>
              {section.hint}
            </div>
            <ul className="mt-2 space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {section.soon.map((label) => (
                <li
                  key={label}
                  className="cursor-default px-2 py-1.5 text-sm"
                  style={{ color: "var(--muted)", opacity: 0.6 }}
                  title="Coming in panel phase 2"
                >
                  {label} <span className="text-[10px]">(soon)</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
