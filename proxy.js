const http = require("http")
const https = require("https")
const fs = require("fs")
const path = require("path")

const TARGET_PORT = 3001
const PROXY_PORT = 3000

const keyPath = path.join(__dirname, "certs/server.key")
const certPath = path.join(__dirname, "certs/server.crt")

const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

function handleRequest(req, res) {
  const options = {
    hostname: "localhost",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      "x-forwarded-proto": hasCerts ? "https" : "http",
    },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  req.pipe(proxyReq, { end: true })

  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain" })
    res.end("Bad Gateway: Next.js server is not running on port " + TARGET_PORT)
  })
}

if (hasCerts) {
  const credentials = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }
  https.createServer(credentials, handleRequest).listen(PROXY_PORT, () => {
    console.log(`[Proxy] Secure HTTPS reverse proxy on https://localhost:${PROXY_PORT} -> http://localhost:${TARGET_PORT}`)
  })
} else {
  http.createServer(handleRequest).listen(PROXY_PORT, () => {
    console.log(`[Proxy] Running HTTP reverse proxy on http://localhost:${PROXY_PORT} -> http://localhost:${TARGET_PORT}`)
    console.log(`[Proxy] To enable HTTPS, place server.key and server.crt inside certs/ folder.`)
  })
}
