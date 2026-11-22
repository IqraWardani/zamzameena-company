import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_COST = 32_768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyAdminPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltValue, keyValue, extra] =
    encodedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    Number(cost) !== SCRYPT_COST ||
    Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelization) !== SCRYPT_PARALLELIZATION ||
    !saltValue ||
    !keyValue ||
    extra !== undefined
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedKey = Buffer.from(keyValue, "base64url");
  if (salt.length !== 16 || expectedKey.length !== KEY_LENGTH) return false;

  const actualKey = await deriveKey(password, salt);

  return timingSafeEqual(actualKey, expectedKey);
}
