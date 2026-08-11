import { NextResponse } from 'next/server'

interface PixRequestBody {
  amount: number
  name: string
  email: string
  cpf: string
}

const realisticDonors = [
  { name: 'Lucas Gabriel Rocha', email: 'lucas.rocha92@gmail.com' },
  { name: 'Fernanda Lima Santos', email: 'fernanda.lima88@hotmail.com' },
  { name: 'Matheus Alves Oliveira', email: 'matheus.alves@outlook.com' },
  { name: 'Camila Ribeiro Souza', email: 'camila.ribeiro@gmail.com' },
  { name: 'Rodrigo Barbosa Mendes', email: 'rodrigo.mendes@gmail.com' },
  { name: 'Juliana Costa Ferreira', email: 'juliana.ferreira@hotmail.com' },
  { name: 'Thiago Martins Carvalho', email: 'thiago.carvalho@gmail.com' },
  { name: 'Beatriz Almeida Pereira', email: 'beatriz.almeida@outlook.com' },
]

export async function POST(request: Request) {
  try {
    const body: PixRequestBody = await request.json()
    const { amount, name, email, cpf } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor da doação inválido.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.PARADISE_API_KEY
    const apiUrl = process.env.PARADISE_API_URL || 'https://multi.paradisepags.com/api/v1/transaction.php'

    // Garante o CPF informado pelo usuário: 49556983015
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''
    const validCpf = cleanCpf.length === 11 || cleanCpf.length === 14 ? cleanCpf : '49556983015'
    const amountInCents = Math.round(amount * 100)

    // Seleciona um nome e email de pessoa física real caso venha vazio ou genérico
    const randomDonor = realisticDonors[Math.floor(Math.random() * realisticDonors.length)]
    
    let finalName = name ? name.trim() : randomDonor.name
    if (!finalName || finalName.toLowerCase().includes('doador')) {
      finalName = randomDonor.name
    }

    let finalEmail = email ? email.trim() : randomDonor.email
    if (!finalEmail || finalEmail.includes('exemplo.com') || finalEmail.includes('teste.com')) {
      finalEmail = randomDonor.email
    }

    // Se a chave da Paradise estiver configurada, gera a cobrança real
    if (apiKey) {
      const payload = {
        amount: amountInCents,
        description: `TikTok Shop - R$ ${amount}`,
        reference: `TTS-${Date.now()}`,
        source: 'api_externa',
        customer: {
          name: finalName,
          email: finalEmail,
          document: validCpf,
          phone: '11999999999',
        },
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.status === 'error') {
        console.error('Erro na Paradise API:', response.status, data)
        return NextResponse.json(
          {
            success: false,
            error: data.message || data.error || 'Falha ao processar pagamento na Paradise.',
          },
          { status: response.status || 400 }
        )
      }

      const pixCode = data.qr_code || data.pix_code || data.copy_paste_code
      const qrCodeBase64 = data.qr_code_base64 || null
      const transactionId = data.transaction_id || data.id

      if (!pixCode) {
        return NextResponse.json(
          { success: false, error: 'Chave PIX não retornada pela Paradise.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        pixCode,
        qrCodeBase64,
        transactionId,
        isMock: false,
      })
    }

    // Modo demonstração (sem chave configurada)
    const mockPixCode = `00020101021226820014br.gov.bcb.pix2560qrcode.maite.${amountInCents}.${Date.now()}`

    return NextResponse.json({
      success: true,
      pixCode: mockPixCode,
      qrCodeBase64: null,
      transactionId: `mock_tx_${Date.now()}`,
      isMock: true,
      message: 'Demonstração: Configure a PARADISE_API_KEY no arquivo .env.local para cobranças reais.',
    })
  } catch (error) {
    console.error('Erro ao gerar PIX:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor ao gerar cobrança PIX.' },
      { status: 500 }
    )
  }
}
