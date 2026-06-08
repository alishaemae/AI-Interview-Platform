"""Email & Phone verification service — sends codes via SMTP."""
import os, random, string, logging, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

def generate_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

def _get_smtp():
    return os.getenv("SMTP_HOST","smtp.gmail.com"), int(os.getenv("SMTP_PORT","587")), os.getenv("SMTP_USER",""), os.getenv("SMTP_PASS","")

def _send_smtp(to, subject, html, text=""):
    host,port,user,pwd = _get_smtp()
    if not user or not pwd:
        logger.warning(f"SMTP not configured. Would send to {to}: {text}")
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['From']=user; msg['To']=to; msg['Subject']=subject
        if text: msg.attach(MIMEText(text,'plain'))
        msg.attach(MIMEText(html,'html'))
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=15) as s:
                s.login(user, pwd); s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as s:
                s.starttls(); s.login(user, pwd); s.send_message(msg)
        logger.info(f"Email sent to {to}")
        return True
    except Exception as e:
        logger.error(f"SMTP error to {to}: {e}")
        return False

async def send_verification_email(to_email: str, code: str) -> bool:
    html = f'''<html><body style="font-family:Arial;background:#1a1a2e;color:#e0e0e0;padding:40px">
    <div style="max-width:400px;margin:0 auto;background:#16213e;border-radius:12px;padding:30px;text-align:center">
    <h2 style="color:#4fc3f7">AI Interview Platform</h2><p>Ваш код подтверждения:</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#4fc3f7;margin:20px 0;padding:15px;background:#0f3460;border-radius:8px">{code}</div>
    <p style="color:#888;font-size:12px">Код действителен 10 минут.</p></div></body></html>'''
    sent = _send_smtp(to_email, 'AI Interview Platform — Код подтверждения', html, f'Ваш код подтверждения: {code}')
    if not sent:
        logger.warning(f"SMTP not configured. Verification code for {to_email}: {code}")
    return True

async def send_verification_sms(phone: str, code: str) -> bool:
    """Send code to phone. In production use SMS API; here logs to console."""
    clean = phone.replace(' ','').replace('-','').replace('(','').replace(')','')
    if clean.startswith('8') and len(clean)==11: clean = '+7'+clean[1:]
    logger.warning(f"SMS service: Verification code for {clean}: {code}")
    # In production: integrate with SMS API (e.g. sms.ru, SMSC, Twilio)
    # import httpx
    # await httpx.AsyncClient().get(f"https://sms.ru/sms/send?api_id=YOUR_KEY&to={clean}&msg=Код:{code}")
    return True
