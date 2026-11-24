import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: `Terms of service · ${APP_NAME}` };
const CONTACT = "https://github.com/eric-65/showupsats/issues";

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="24 November 2026">
      <p>By using {APP_NAME} you agree to these terms. If you don't agree, please don't use the service.</p>

      <h2>1. What {APP_NAME} is</h2>
      <p>{APP_NAME} provides booking links for service providers. Clients pay a deposit as a Lightning <b>hold invoice</b>: the payment is locked in the client's own wallet until the provider accepts. If the provider accepts, the deposit goes directly to the provider's wallet. If they decline or don't answer in time, it is cancelled automatically.</p>

      <h2>2. Not a bank, not escrow</h2>
      <p>{APP_NAME} <b>never holds or controls anyone's money</b>. Payments go directly between wallets. Once a deposit is accepted and settled, we cannot reverse it. Refunds are paid by the provider's own wallet under the provider's cancellation policy and budget.</p>

      <h2>3. Cancellation policies</h2>
      <p>Each provider sets their own cancellation policy. When you book, you agree to that provider's policy, which is shown in full before you pay and included (as a hash) in your signed receipt. Disputes about a service are between the client and the provider.</p>

      <h2>4. Show-up records</h2>
      <p>Records of completed bookings, refunds, no-shows and disputes are shown publicly. They reflect what each side reported, signed by {APP_NAME}. They are not a court ruling or a judgement on anyone.</p>

      <h2>5. Accounts and invites</h2>
      <ul>
        <li>You may sign in with Google. Keep your account secure; you're responsible for activity on it.</li>
        <li>Invite links are for inviting real people. Don't create fake accounts or spam invite links; we may remove fake accounts and invites.</li>
        <li>You choose whether your profile is shown in the community.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>Don't use {APP_NAME} for anything illegal, to harass anyone, to attack or overload the service, or to impersonate others.</p>

      <h2>7. Test service and availability</h2>
      <p>{APP_NAME} is currently a demo running on test Lightning wallets with no real money. The service is provided “as is”, without warranties, and may change or stop at any time.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the extent allowed by law, {APP_NAME} is not liable for losses arising from use of the service, wallet or network failures, or disputes between clients and providers.</p>

      <h2>9. Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version.</p>

      <h2>Contact</h2>
      <p><a href={CONTACT} target="_blank" rel="noopener noreferrer">github.com/eric-65/showupsats/issues</a></p>
    </LegalPage>
  );
}
