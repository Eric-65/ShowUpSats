import { serverLang } from "@/lib/lang";
import { Onboarding } from "./Onboarding";
import { APP_WORDMARK, CURRENCY_ALLOWLIST } from "@/lib/config";
import { defaultPolicy } from "@/lib/policy";
import { currentProviderId } from "@/lib/server/auth";
export const metadata = { title: "Create your booking link" };
export default async function OnboardPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { d } = await serverLang();
  const loggedIn = !!(await currentProviderId());
  const step = loggedIn && (await searchParams).step === "2" ? 2 : 1;
  return (
    <>
      <header className="site-header"><a className="wordmark" href="/">{APP_WORDMARK}</a></header>
      <main className="onboard section--dark">
        <h1 className="display">{d.onboardTitle}</h1>
        <Onboarding d={d} currencies={[...CURRENCY_ALLOWLIST]} defaultPolicy={defaultPolicy(24)} startStep={step} />
      </main>
    </>
  );
}
