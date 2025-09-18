import puppeteer from "puppeteer"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export async function POST(request) {
  let browser = null
  let page = null

  try {
    const { html, filename } = await request.json()

    if (!html) {
      return NextResponse.json({ error: "HTML content is required" }, { status: 400 })
    }

    console.log("[v0] Starting PDF generation with Puppeteer")

    const convertImagesToBase64 = (htmlContent) => {
      try {
        const imgPath1 = path.join(process.cwd(), "public", "assets", "img", "mymsoftcom.png")
        const imgPath2 = path.join(process.cwd(), "public", "assets", "img", "malibu.png")

        let processedHtml = htmlContent

        // Convert M&M logo to base64 if exists
        if (fs.existsSync(imgPath1)) {
          const imgBuffer1 = fs.readFileSync(imgPath1)
          const imgBase64_1 = `data:image/png;base64,${imgBuffer1.toString("base64")}`
          processedHtml = processedHtml.replace(/src="\/assets\/img\/mymsoftcom\.png"/g, `src="${imgBase64_1}"`)
          console.log("[v0] Converted mymsoftcom.png to base64")
        } else {
          console.log("[v0] mymsoftcom.png not found, keeping original src")
        }

        // Convert Malibu logo to base64 if exists
        if (fs.existsSync(imgPath2)) {
          const imgBuffer2 = fs.readFileSync(imgPath2)
          const imgBase64_2 = `data:image/png;base64,${imgBuffer2.toString("base64")}`
          processedHtml = processedHtml.replace(/src="\/assets\/img\/malibu\.png"/g, `src="${imgBase64_2}"`)
          console.log("[v0] Converted malibu.png to base64")
        } else {
          console.log("[v0] malibu.png not found, keeping original src")
        }

        return processedHtml
      } catch (error) {
        console.log("[v0] Error converting images to base64:", error.message)
        return htmlContent
      }
    }

    browser = await puppeteer.launch({
      headless: true,
      timeout: 60000, // 60 seconds timeout
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
      ],
    })

    page = await browser.newPage()

    await page.setDefaultTimeout(60000)
    await page.setDefaultNavigationTimeout(60000)

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 })

    const processedHtml = convertImagesToBase64(html)

    console.log("[v0] Loading HTML content with base64 images")

    await page.setContent(processedHtml, {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 45000,
    })

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, (img) => {
          if (img.complete) {
            console.log(`[v0] Image already loaded: ${img.src.substring(0, 50)}...`)
            return Promise.resolve()
          }
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.log(`[v0] Image timeout: ${img.src.substring(0, 50)}...`)
              resolve()
            }, 5000) // Reduced timeout since base64 images should load quickly

            img.addEventListener("load", () => {
              console.log(`[v0] Image loaded successfully: ${img.src.substring(0, 50)}...`)
              clearTimeout(timeout)
              resolve()
            })
            img.addEventListener("error", (e) => {
              console.log(`[v0] Image failed to load: ${img.src.substring(0, 50)}...`, e)
              clearTimeout(timeout)
              resolve()
            })
          })
        }),
      )
    })

    console.log("[v0] HTML content loaded, generating PDF")

    // Detectar si es cualquier plantilla de contrato para usar header específico
    const isContractTemplate = processedHtml.includes("TEMPLATE:") || processedHtml.includes("CONTRATO DE ARRAS")
    
    console.log("[v0] Contract template detection:", isContractTemplate)
    
    let pdfOptions = {
      format: "A4",
      margin: {
        top: isContractTemplate ? "100px" : "1cm",
        right: "1.5cm",
        bottom: "2cm",
        left: "1.5cm",
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: isContractTemplate,
      scale: 1,
      timeout: 30000,
      pageRanges: "",
    }

    // Agregar header específico para contratos
    if (isContractTemplate) {
      const imgPath1 = path.join(process.cwd(), "public", "assets", "img", "mymsoftcom.png")
      const imgPath2 = path.join(process.cwd(), "public", "assets", "img", "malibu.png")
      
      // Extraer consecutivo del HTML procesado
      let consecutivo = ""
      console.log("[v0] SERVER: Looking for consecutivo in HTML...");
      console.log("[v0] SERVER: HTML start:", processedHtml.substring(0, 300));
      
      // Método 1: Buscar en comentario HTML
      const consecutivoMatch = processedHtml.match(/<!--CONSECUTIVO:([^>]*)-->/);
      if (consecutivoMatch) {
        consecutivo = consecutivoMatch[1].trim();
        console.log("[v0] SERVER: Consecutivo found in comment:", consecutivo);
      } else {
        console.log("[v0] SERVER: No consecutivo comment found, trying alternative methods...");
        
        // Método 2: Buscar placeholder no procesado {{CONSECUTIVO}}
        const placeholderMatch = processedHtml.match(/\{\{CONSECUTIVO\}\}/);
        if (placeholderMatch) {
          console.log("[v0] SERVER: Found unprocessed CONSECUTIVO placeholder - this means temporaryData.consecutivo was empty");
        }
        
        // Método 3: Para debug, usar un valor fijo si no se encuentra
        console.log("[v0] SERVER: No consecutivo found, will show empty in header");
      }
      
      // Detectar el proyecto específico para usar el logo correcto
      let projectLogo = "malibu.png" // default
      if (processedHtml.includes("TEMPLATE: luxury")) {
        projectLogo = "luxury.png"
      } else if (processedHtml.includes("TEMPLATE: reservas")) {
        projectLogo = "reservas.png"
      } else if (processedHtml.includes("TEMPLATE: malibu")) {
        projectLogo = "malibu.png"
      }
      
      const projectLogoPath = path.join(process.cwd(), "public", "assets", "img", projectLogo)
      
      console.log("[v0] SERVER: Creating header with consecutivo:", consecutivo);
      
      pdfOptions.headerTemplate = `
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;font-size:11pt;padding:5px 40px;margin:0;background:white;box-sizing:border-box;">
          <img src="data:image/png;base64,${fs.readFileSync(imgPath1).toString("base64")}" style="height:60px;">
          <div style="font-weight:bold;flex-grow:1;text-align:center;margin:0 20px;font-size:6pt;line-height:1.2;">
            <div>CONTRATO DE ARRAS</div>
            ${consecutivo ? `<div style="font-size:6pt;margin-top:2px;color:black;">${consecutivo}</div>` : '<div style="font-size:6pt;margin-top:2px;color:red;">NO_CONSECUTIVO</div>'}
          </div>
          <img src="data:image/png;base64,${fs.readFileSync(projectLogoPath).toString("base64")}" style="height:60px;">
        </div>
      `
      pdfOptions.footerTemplate = `<div></div>`
    }

    const pdfBuffer = await page.pdf(pdfOptions)

    console.log("[v0] PDF generated successfully")

    await page.close()
    await browser.close()
    browser = null
    page = null

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename || "contract.pdf"}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating PDF:", error)

    try {
      if (page) await page.close()
      if (browser) await browser.close()
    } catch (closeError) {
      console.error("[v0] Error during cleanup:", closeError)
    }

    return NextResponse.json(
      {
        error: `Failed to generate PDF: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
