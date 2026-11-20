export const DEFAULT_POLICY_EN = `Deposit policy:
1. Your deposit is locked, not sent, until I accept (within 10 minutes). If I don't accept, it is cancelled and you keep your sats.
2. If you cancel at least {hours} hours before the appointment, you get the full deposit back automatically.
3. If you cancel later, or don't show up within 15 minutes of the start time, I keep the deposit.
4. If I cancel, or I'm not there, you get the full deposit back.
5. The deposit counts toward the price of the service.`;
export const defaultPolicy = (hours: number) => DEFAULT_POLICY_EN.replace("{hours}", String(hours));
