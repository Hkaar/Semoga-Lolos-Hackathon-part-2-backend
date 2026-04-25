import { Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  burn,
  getAccount,
} from "@solana/spl-token";
import { connection, serverKeypair, ecoMintPublicKey } from "@/lib/solana/connection";

const DECIMALS = 6;

function toRaw(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** DECIMALS));
}

function fromRaw(raw: bigint): number {
  return Number(raw) / 10 ** DECIMALS;
}

/**
 * Get or create the Associated Token Account (ATA) for a wallet.
 * Server pays rent + fee.
 */
export async function getOrCreateATA(ownerAddress: string): Promise<PublicKey> {
  const owner = new PublicKey(ownerAddress);
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    serverKeypair,    // payer
    ecoMintPublicKey,
    owner
  );
  return ata.address;
}

/**
 * Mint ECO tokens to a user wallet.
 * Server wallet must be the mint authority.
 */
export async function mintTokens(toAddress: string, amount: number): Promise<string> {
  const ata = await getOrCreateATA(toAddress);
  const sig = await mintTo(
    connection,
    serverKeypair,    // payer
    ecoMintPublicKey,
    ata,
    serverKeypair,    // mint authority
    toRaw(amount)
  );
  console.log(`Minted ${amount} ECO → ${toAddress} | tx: ${sig}`);
  return sig;
}

/**
 * Transfer ECO tokens between wallets.
 * Server pays the fee; sender keypair signs the transfer.
 */
export async function transferTokens(
  senderKeypair: Keypair,
  toAddress: string,
  amount: number
): Promise<string> {
  const fromATA = await getOrCreateATA(senderKeypair.publicKey.toBase58());
  const toATA   = await getOrCreateATA(toAddress);

  const sig = await transfer(
    connection,
    serverKeypair,    // payer (fee)
    fromATA,
    toATA,
    senderKeypair,    // owner/authority of fromATA
    toRaw(amount)
  );
  console.log(`Transferred ${amount} ECO → ${toAddress} | tx: ${sig}`);
  return sig;
}

/**
 * Reward a user by minting ECO tokens directly to their wallet.
 * Use for positive climate actions.
 */
export async function rewardUser(toAddress: string, amount: number): Promise<string> {
  return mintTokens(toAddress, amount);
}

/**
 * Deduct ECO tokens from a user by burning them.
 * Server pays fee; user keypair signs the burn.
 */
export async function deductTokens(
  userKeypair: Keypair,
  amount: number
): Promise<string> {
  const ata = await getOrCreateATA(userKeypair.publicKey.toBase58());
  const sig = await burn(
    connection,
    serverKeypair,    // payer
    ata,
    ecoMintPublicKey,
    userKeypair,      // owner
    toRaw(amount)
  );
  console.log(`Burned ${amount} ECO from ${userKeypair.publicKey.toBase58()} | tx: ${sig}`);
  return sig;
}

/**
 * Get ECO token balance for a wallet.
 * Returns 0 if no ATA exists yet.
 */
export async function getBalance(walletAddress: string): Promise<number> {
  try {
    const ata = await getOrCreateATA(walletAddress);
    const account = await getAccount(connection, ata);
    return fromRaw(account.amount);
  } catch {
    return 0;
  }
}