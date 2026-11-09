import nodemailer from 'nodemailer';

/**
 * Correo transaccional desde la cuenta oficial (kiin.colab@gmail.com) por SMTP.
 * Credenciales solo en variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Sin SMTP no se envía nada y solo se registra el asunto y el destinatario enmascarado (nunca el enlace).
 */
type Mail={to:string;subject:string;text:string;html:string};
let transport:nodemailer.Transporter|null=null;
/** a***@dominio: suficiente para depurar sin escribir el correo completo en los registros. */
export function maskEmail(email:string){const [u,d]=email.split('@');return `${(u||'').slice(0,1)}***@${d||''}`;}
function configured(){return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS);}
function getTransport(){
  if(!transport){const port=Number(process.env.SMTP_PORT)||465;transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});}
  return transport;
}

/** Base de los enlaces. Nunca se toma de la cabecera Host (evita envenenar enlaces de recuperación). */
export function siteBase(){
  const url=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'');
  if(url)return url;
  if(process.env.NODE_ENV!=='production')return 'http://127.0.0.1:3000';
  throw new Error('Falta NEXT_PUBLIC_SITE_URL en producción.');
}

/** Envía un correo. Devuelve false si no se pudo (el llamador no lo revela al usuario). */
export async function sendMail(mail:Mail):Promise<boolean>{
  if(!configured()){
    // Nunca se imprime el cuerpo: contiene enlaces de un solo uso (recuperación/confirmación).
    if(process.env.NODE_ENV!=='production'){console.info(`[mail] SMTP sin configurar (desarrollo): no se envió «${mail.subject}» a ${maskEmail(mail.to)}. Configura SMTP_* en .env.local.`);return false;}
    console.error('[mail] SMTP sin configurar en producción');return false;
  }
  try{
    await getTransport().sendMail({from:process.env.MAIL_FROM||`KIIN <${process.env.SMTP_USER}>`,to:mail.to,subject:mail.subject,text:mail.text,html:mail.html});
    return true;
  }catch(error){console.error('[mail] envío fallido:',error instanceof Error?error.message:'error');return false;}
}

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function layout(title:string,body:string,cta?:{label:string;url:string}){
  return `<!doctype html><html lang="es-MX"><body style="margin:0;background:#FEE8D0;color:#222222;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid #222222"><tr><td style="padding:28px"><p style="font-size:28px;font-weight:bold;letter-spacing:-1px;margin:0 0 20px">KIIN</p><h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>${body}${cta?`<p style="margin:26px 0"><a href="${esc(cta.url)}" style="background:#F25623;color:#222222;border:2px solid #222222;padding:12px 18px;text-decoration:none;font-weight:bold;display:inline-block">${esc(cta.label)}</a></p><p style="font-size:12px;color:#514a44">Si el botón no funciona, copia este enlace en tu navegador:<br>${esc(cta.url)}</p>`:''}<p style="font-size:12px;color:#514a44;margin-top:24px">Si no solicitaste esto, ignora este correo: tu cuenta sigue igual.</p></td></tr></table></td></tr></table></body></html>`;
}

export function resetMail(to:string,url:string,minutes:number):Mail{
  return {to,subject:'Restablece tu contraseña de KIIN',
    text:`Recibimos una solicitud para restablecer la contraseña de tu cuenta KIIN.\n\nAbre este enlace para elegir una nueva (vence en ${minutes} minutos y solo funciona una vez):\n${url}\n\nSi no fuiste tú, ignora este correo.`,
    html:layout('Restablece tu contraseña',`<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. El enlace vence en ${minutes} minutos y solo funciona una vez.</p>`,{label:'Elegir nueva contraseña',url})};
}
export function verifyMail(to:string,url:string,hours:number):Mail{
  return {to,subject:'Confirma tu correo en KIIN',
    text:`Gracias por crear tu cuenta en KIIN.\n\nConfirma tu correo con este enlace (vence en ${hours} horas):\n${url}`,
    html:layout('Confirma tu correo',`<p>Gracias por crear tu cuenta en KIIN. Confirma tu correo para empezar a guardar y dar me gusta.</p>`,{label:'Confirmar correo',url})};
}
export function existingAccountMail(to:string,loginUrl:string,resetUrl:string):Mail{
  return {to,subject:'Ya tienes una cuenta en KIIN',
    text:`Alguien intentó crear una cuenta con este correo, pero ya tienes una.\n\nEntra: ${loginUrl}\n¿Olvidaste tu contraseña? ${resetUrl}`,
    html:layout('Ya tienes una cuenta',`<p>Alguien intentó crear una cuenta con este correo, pero ya existe una. Puedes entrar o, si no recuerdas tu contraseña, restablecerla.</p><p><a href="${esc(resetUrl)}">Restablecer contraseña</a></p>`,{label:'Entrar a KIIN',url:loginUrl})};
}
