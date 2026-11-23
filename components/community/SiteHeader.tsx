import { APP_WORDMARK } from "@/lib/config";
import { currentMember, publicName } from "@/lib/server/members";
export async function CommunityHeader() {
  const me = await currentMember();
  return (
    <header className="site-header">
      <a className="wordmark" href="/">{APP_WORDMARK}</a>
      <a className="btn btn--outline hdr-btn" href="/community">Community</a>
      {me ? <a className="btn btn--lime hdr-btn" href="/me">{publicName(me.name)}</a> : <a className="btn btn--lime hdr-btn" href="/join">Join</a>}
    </header>
  );
}
