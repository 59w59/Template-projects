const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const certsDir = path.join(__dirname, "../certs")
const keyPath = path.join(certsDir, "server.key")
const certPath = path.join(certsDir, "server.crt")

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true })
}

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  process.exit(0)
}

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -sha256 -days 365 -nodes -subj "/CN=localhost"`,
    { stdio: "ignore" }
  )
} catch (error) {
  // Silent fallback: developer will receive instructions or check docs/
}
