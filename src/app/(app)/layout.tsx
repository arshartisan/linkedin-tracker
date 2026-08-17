import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BizProvider } from "@/components/BizProvider";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/*
  Reading the cookie here makes the shell dynamic, which is the point: it's how
  the client learns who it is. proxy.ts has already turned away anyone without a
  session, so the redirect below is a backstop, not the gate.
*/
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const me = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!me) redirect("/login");

  return (
    /*
      BizProvider sits inside DataProvider because it reads `me` from it rather
      than taking the session a second time - and outside SidebarProvider
      because the nav badges a count from both pipelines.
    */
    <DataProvider me={me}>
      <BizProvider>
        <SidebarProvider>
          <Nav />
          {/* The rail is fixed, so only this pane scrolls. */}
          <SidebarInset className="pb-24 md:pb-0">{children}</SidebarInset>
        </SidebarProvider>
      </BizProvider>
    </DataProvider>
  );
}
