// Alfabeto sin chars ambiguos (0/O/1/l/I) para que la contraseña se pueda
// dictar/copiar sin confusión.
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?"

export function generatePassword(length = 16): string {
  const cryptoObj =
    typeof window !== "undefined" && window.crypto ? window.crypto : null
  const out: string[] = []
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(length)
    cryptoObj.getRandomValues(buf)
    for (let i = 0; i < length; i++) {
      out.push(PASSWORD_ALPHABET[buf[i] % PASSWORD_ALPHABET.length])
    }
  } else {
    for (let i = 0; i < length; i++) {
      out.push(
        PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)],
      )
    }
  }
  return out.join("")
}
