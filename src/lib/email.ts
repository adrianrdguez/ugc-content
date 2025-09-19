import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

export interface UGCInvitationData {
  customerEmail: string
  customerName: string
  shopDomain: string
  customerId: string
}

export function generateUGCToken(customerId: string, shopDomain: string, timestamp?: number): string {
  const ts = timestamp || Date.now()
  const data = `${customerId}:${shopDomain}:${ts}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function validateUGCToken(token: string, customerId: string, shopDomain: string, sentAt: string): boolean {
  const timestamp = new Date(sentAt).getTime()
  const expectedToken = generateUGCToken(customerId, shopDomain, timestamp)
  return expectedToken === token
}

export function generateUGCFormUrl(token: string): string {
  const baseUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/ugc-form?token=${token}`
}

export async function sendUGCInvitationEmail(data: UGCInvitationData): Promise<boolean> {
  try {
    // Usar timestamp actual para generar token consistente
    const currentTimestamp = Date.now()
    const token = generateUGCToken(data.customerId, data.shopDomain, currentTimestamp)
    const ugcFormUrl = generateUGCFormUrl(token)

    // Obtener template personalizado de la tienda (si existe)
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('email_template, reward_type, reward_value, reward_currency')
      .eq('shopify_domain', data.shopDomain)
      .single()

    const emailTemplate = shop?.email_template || getDefaultEmailTemplate()
    const rewardText = getRewardText(shop?.reward_type, shop?.reward_value, shop?.reward_currency)

    // Personalizar el template
    const emailContent = emailTemplate
      .replace('{{customer_name}}', data.customerName)
      .replace('{{ugc_form_url}}', ugcFormUrl)
      .replace('{{reward_text}}', rewardText)
      .replace('{{shop_domain}}', data.shopDomain)

    // Por ahora solo logeamos - aquí integrarías tu proveedor de email
    console.log('📧 UGC Invitation Email:')
    console.log('To:', data.customerEmail)
    console.log('Subject: ¡Comparte tu experiencia y obtén una recompensa!')
    console.log('UGC Form URL:', ugcFormUrl)
    console.log('Token:', token)
    console.log('Content:', emailContent)

    // TODO: Integrar con proveedor de email (SendGrid, Resend, etc.)
    // await sendEmailViaProvider({
    //   to: data.customerEmail,
    //   subject: '¡Comparte tu experiencia y obtén una recompensa!',
    //   html: emailContent
    // })

    return true
  } catch (error) {
    console.error('Error sending UGC invitation email:', error)
    return false
  }
}

function getDefaultEmailTemplate(): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>¡Hola {{customer_name}}! 🎬</h2>
      
      <p>¡Gracias por ser un cliente leal de {{shop_domain}}!</p>
      
      <p>Nos encantaría que compartieras tu experiencia con nuestros productos creando un breve video de testimonio.</p>
      
      <p><strong>🎁 Como agradecimiento, recibirás: {{reward_text}}</strong></p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ugc_form_url}}" 
           style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Subir mi video
        </a>
      </div>
      
      <p>El proceso es súper fácil:</p>
      <ol>
        <li>Haz clic en el botón de arriba</li>
        <li>Graba un video corto (30-60 segundos) mostrando el producto</li>
        <li>Súbelo usando nuestro formulario</li>
        <li>¡Recibe tu recompensa una vez aprobado!</li>
      </ol>
      
      <p>¡Esperamos ver tu video pronto!</p>
      
      <p>Saludos,<br>El equipo de {{shop_domain}}</p>
    </div>
  `
}

function getRewardText(
  rewardType?: string, 
  rewardValue?: number, 
  rewardCurrency?: string
): string {
  if (rewardType === 'discount') {
    return `Un descuento de ${rewardValue}${rewardCurrency === 'PERCENTAGE' ? '%' : ` ${rewardCurrency}`}`
  } else if (rewardType === 'gift_card') {
    return `Una gift card de ${rewardValue} ${rewardCurrency}`
  }
  return 'Una recompensa especial'
}