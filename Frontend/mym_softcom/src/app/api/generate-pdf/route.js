import puppeteer from "puppeteer"
import { NextResponse } from "next/server"
import path from "path"

export async function POST(request) {
  let browser = null
  let page = null

  try {
    const { html, filename } = await request.json()

    if (!html) {
      return NextResponse.json({ error: "HTML content is required" }, { status: 400 })
    }

    console.log("[v0] Starting PDF generation with Puppeteer")

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

    await page.setRequestInterception(true)

    page.on("request", (request) => {
      const url = request.url()

      // Handle local asset requests
      if (url.includes("/assets/img/")) {
        // Convert to absolute file path
        const imagePath = url.replace(/.*\/assets\/img\//, "")
        const fullPath = path.join(process.cwd(), "public", "assets", "img", imagePath)

        console.log(`[v0] Intercepting image request: ${url} -> ${fullPath}`)

        // Continue with the original request
        request.continue()
      } else {
        request.continue()
      }
    })

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 })

    const processedHtml = html.replace(
      /src="\/assets\/img\//g,
      `src="file://${path.join(process.cwd(), "public", "assets", "img").replace(/\\/g, "/")}/`,
    )

    console.log("[v0] Loading HTML content with processed image paths")

    await page.setContent(processedHtml, {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 45000,
    })

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, (img) => {
          if (img.complete) {
            console.log(`[v0] Image already loaded: ${img.src}`)
            return Promise.resolve()
          }
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.log(`[v0] Image timeout: ${img.src}`)
              resolve() // Don't reject, just resolve to continue
            }, 15000) // 15 second timeout per image

            img.addEventListener("load", () => {
              console.log(`[v0] Image loaded successfully: ${img.src}`)
              clearTimeout(timeout)
              resolve()
            })
            img.addEventListener("error", (e) => {
              console.log(`[v0] Image failed to load: ${img.src}`, e)
              clearTimeout(timeout)
              resolve() // Don't reject, just resolve to continue
            })
          })
        }),
      )
    })

    console.log("[v0] HTML content loaded, generating PDF")

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "2.5cm",
        right: "2cm",
        bottom: "2.5cm",
        left: "2cm",
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1,
      timeout: 30000, // 30 seconds for PDF generation
    })

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
