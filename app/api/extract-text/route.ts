import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = file.name.toLowerCase()

  try {
    if (filename.endsWith('.pdf')) {
      const PDFParser = (await import('pdf2json')).default
      const text = await new Promise<string>((resolve, reject) => {
        const parser = new PDFParser()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parser.on('pdfParser_dataReady', (data: any) => {
          const extracted = data.Pages
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .flatMap((page: any) => page.Texts)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((t: any) => decodeURIComponent(t.R.map((r: any) => r.T).join('')))
            .join(' ')
          resolve(extracted)
        })
        parser.on('pdfParser_dataError', reject)
        parser.parseBuffer(buffer)
      })
      return NextResponse.json({ text })
    }

    if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return NextResponse.json({ text: result.value })
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[extract-text] error:', e?.message)
    return NextResponse.json({ error: 'Error extrayendo texto' }, { status: 500 })
  }
}
