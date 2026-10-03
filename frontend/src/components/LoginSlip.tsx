import { QRCodeSVG } from "qrcode.react";
import type { EventDetails } from "@/lib/api";
import { studentLoginUrl, studentPortalAddress, wifiQrText } from "@/lib/loginSlips";

export interface SlipLogin {
  username: string;
  password: string;
}

/**
 * One team's login slip (issue #37). Sized in millimetres for an 80 mm till printer (72 mm printable, e.g.
 * Epson TM-T88) and reused on A4. Pure black on white with no greys: thermal printers fade anything lighter.
 */
export const LoginSlip = ({ login, details, address }: { login: SlipLogin; details?: EventDetails; address: string }) => {
  const wifi = wifiQrText(details);
  return (
    <article className="login-slip" aria-label={`Login slip for ${login.username}`}>
      <header className="login-slip__brand">BT ENTERPRISE DAY NEWS</header>

      <div className="login-slip__label">Team</div>
      <div className="login-slip__team">{login.username}</div>
      <div className="login-slip__label">Password</div>
      <div className="login-slip__password">{login.password}</div>

      {wifi && (
        <section className="login-slip__step">
          <QRCodeSVG value={wifi} size={96} level="M" marginSize={0} title="Join the event Wi-Fi" />
          <div>
            <div className="login-slip__step-title">1. Join the Wi-Fi</div>
            <div>{details?.wifiName}</div>
            {details?.wifiPassword && <div className="login-slip__mono">{details.wifiPassword}</div>}
          </div>
        </section>
      )}

      <section className="login-slip__step">
        <QRCodeSVG
          value={studentLoginUrl(address, login.username)}
          size={96}
          level="M"
          marginSize={0}
          title="Open the student app"
        />
        <div>
          <div className="login-slip__step-title">{wifi ? "2. " : ""}Open the app</div>
          <div>Scan, or type:</div>
          <div className="login-slip__mono">{studentPortalAddress(address)}</div>
        </div>
      </section>

      <footer className="login-slip__footer">Keep this slip safe. Don't share your password with other teams.</footer>
    </article>
  );
};
