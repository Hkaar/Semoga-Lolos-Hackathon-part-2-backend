import { createMint } from "@solana/spl-token";
import { connection, serverKeypair } from "@/lib/solana/connection";

async function main(): Promise<void> {
  console.log("Creating ECO token mint on devnet...");
  console.log("Payer:", serverKeypair.publicKey.toBase58());

  const mint = await createMint(
    connection,
    serverKeypair,               // payer
    serverKeypair.publicKey,     // mint authority
    serverKeypair.publicKey,     // freeze authority (pass null to disable)
    6                            // decimals
  );

  console.log("\nECO Token Mint created!");
  console.log("ECO_TOKEN_MINT_ADDRESS=" + mint.toBase58());
  console.log("\nPaste the line above into your .env file.");
}

main().catch(console.error);