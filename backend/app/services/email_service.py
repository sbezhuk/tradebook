import logging
import secrets
import hashlib
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("tradebook.email")

def generate_otp_code() -> str:
    """Generate a secure 6-digit numeric OTP code."""
    return f"{secrets.randbelow(900000) + 100000}"

def hash_otp_code(code: str, email: str) -> str:
    """Hash the 6-digit OTP combined with the normalized email using SHA-256."""
    norm_email = email.lower().strip()
    return hashlib.sha256(f"{code}:{norm_email}".encode("utf-8")).hexdigest()

def verify_otp_code(code: str, email: str, stored_hash: str) -> bool:
    """Safely verify an OTP code against stored SHA-256 hash."""
    computed_hash = hash_otp_code(code, email)
    return secrets.compare_digest(computed_hash, stored_hash)

def mask_email(email: str) -> str:
    """Mask email for privacy, e.g., trader@gmail.com -> tr***r@gmail.com."""
    if "@" not in email:
        return email
    local_part, domain = email.split("@", 1)
    if len(local_part) <= 2:
        masked_local = local_part[0] + "***"
    elif len(local_part) <= 4:
        masked_local = local_part[0] + "***" + local_part[-1]
    else:
        masked_local = local_part[:2] + "***" + local_part[-1]
    return f"{masked_local}@{domain}"

def _build_email_html(code: str, purpose: str) -> str:
    action_text = "підтвердження реєстрації" if purpose == "registration" else "входу в акаунт"
    spaced_code = "  ".join(list(code))
    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Код підтвердження TradeBook</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0915; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1edfa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0c0915; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background: linear-gradient(180deg, #181229 0%, #110c1e 100%); border-radius: 24px; border: 1px solid rgba(196, 155, 255, 0.2); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); overflow: hidden; padding: 36px 32px;">
          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: #c49bff; color: #110820; font-size: 24px; font-weight: bold; text-align: center; box-shadow: 0 0 25px rgba(196, 155, 255, 0.5);">
                📈
              </div>
              <h1 style="margin: 14px 0 4px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">TradeBook</h1>
              <p style="margin: 0; font-size: 13px; color: rgba(220, 205, 250, 0.6);">Професійний щоденник трейдера</p>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <h2 style="margin: 0 0 10px; font-size: 19px; font-weight: 700; color: #ffffff;">
                Код для {action_text}
              </h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: rgba(220, 205, 250, 0.75); max-width: 400px;">
                Введіть цей 6-значний код для підтвердження. Код дійсний протягом <strong>{settings.OTP_EXPIRE_MINUTES} хвилин</strong>.
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <div style="display: inline-block; background: rgba(196, 155, 255, 0.1); border: 2px solid rgba(196, 155, 255, 0.4); border-radius: 16px; padding: 18px 36px; text-align: center;">
                <span style="font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #c49bff; text-shadow: 0 0 20px rgba(196, 155, 255, 0.4);">
                  {spaced_code}
                </span>
              </div>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(220, 205, 250, 0.6); text-align: center;">
                🛡️ <strong>Безпека:</strong> Ніколи й нікому не передавайте цей код. Співробітники TradeBook ніколи не запитуватимуть його у вас. Якщо ви не робили цього запиту, просто проігноруйте цей лист.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: rgba(220, 205, 250, 0.4);">
                © TradeBook Analytics • Автоматичне повідомлення
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def send_otp_email(to_email: str, code: str, purpose: str = "registration") -> bool:
    """
    Send 6-digit OTP code to the given email using Gmail SMTP.
    If SMTP credentials are not yet configured, log the OTP code to console
    so development and testing can proceed seamlessly.
    """
    action_text = "реєстрації" if purpose == "registration" else "входу"
    subject = f"[{code}] Код підтвердження {action_text} в TradeBook"

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@tradebook.app"
    from_header = f"{settings.SMTP_FROM_NAME} <{from_email}>"

    # Plain text version
    text_content = (
        f"Ваш код для {action_text} в TradeBook: {code}\n\n"
        f"Код дійсний протягом {settings.OTP_EXPIRE_MINUTES} хвилин.\n"
        "Нікому не повідомляйте цей код. Якщо ви не надсилали запит, проігноруйте цей лист."
    )

    # HTML version
    html_content = _build_email_html(code, purpose)

    # If Gmail SMTP credentials are not yet configured, log OTP clearly for dev/test
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "\n" + "=" * 65 + "\n"
            f"📧 [TradeBook OTP] Email to: {to_email}\n"
            f"🔑 6-ЗНАЧНИЙ КОД: >>> {code} <<<\n"
            f"ℹ️ Призначення: {purpose} | Дійсний: {settings.OTP_EXPIRE_MINUTES} хв\n"
            "⚠️ Gmail SMTP не налаштовано в .env (SMTP_USER / SMTP_PASSWORD).\n"
            "   Вкажіть дані в backend/.env для надсилання реальних листів.\n"
            + "=" * 65
        )
        print(
            f"\n[TradeBook OTP] Код для {to_email}: {code} ({purpose})\n"
        )
        return True

    # Real Gmail SMTP sending
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_header
    msg["To"] = to_email
    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        logger.info(f"OTP email sent successfully to {to_email} via Gmail SMTP")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email} via Gmail SMTP: {e}", exc_info=True)
        # Even if SMTP error occurs, raise or return false
        raise RuntimeError(f"Помилка відправки email через Gmail SMTP: {str(e)}")
