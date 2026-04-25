import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { encrypt, decrypt } from "@/src/blockchain/solana/crypto-service";

export interface WalletData {
  address: string;
  encryptedPrivateKey: string;
}

/**
 * Generate a brand-new Solana wallet.
 * Returns public address + AES-256-GCM encrypted private key.
 * Store both fields in MongoDB as-is.
 */
export function generateWallet(): WalletData {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    encryptedPrivateKey: encrypt(bs58.encode(keypair.secretKey)),
  };
}

/**
 * Reconstruct Keypair from encrypted private key (as stored in DB).
 */
export function keypairFromEncrypted(encryptedPrivateKey: string): Keypair {
  const privateKeyBase58 = decrypt(encryptedPrivateKey);
  return Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
}