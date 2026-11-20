import { serverLang } from "@/lib/lang";
import { LoginForm } from "./LoginForm";
import { APP_WORDMARK } from "@/lib/config";
export const metadata = { title: "Log in" };
export default async function LoginPage() {
  const { d } = await serverLang();
  return (
    <>
      <header className="site-header"><a className="wordmark" href="/">{APP_WORDMARK}</a></header>
      <main className="login section--dark"><h1 className="display">{d.login}</h1><LoginForm d={d} /></main>
    </>
  );
}
