import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const connection = new Connection(
  process.env.SOLANA_NET_URL ?? "https://api.devnet.solana.com",
  "confirmed"
);

/** Parse private key accepts byte array [1,2,3,...] or base58 string */
function parsePrivateKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmed) as number[]);
  }
  return bs58.decode(trimmed);
}

/** Server keypair — pays all tx fees */
export const serverKeypair = Keypair.fromSecretKey(
  parsePrivateKey(
    process.env.SOLANA_SERVER_PRIVATE_KEY ??
      (() => { throw new Error("SOLANA_SERVER_PRIVATE_KEY not set"); })()
  )
);

/** ECO token mint public key */
export const ecoMintPublicKey = new PublicKey(
  process.env.ECO_TOKEN_MINT_ADDRESS ??
    (() => { throw new Error("ECO_TOKEN_MINT_ADDRESS not set! set it first or generate it with scripts/init-mint.ts :3"); })()
);