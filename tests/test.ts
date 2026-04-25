import { generateWallet, keypairFromEncrypted } from "@/lib/solana/wallet-service";
import { rewardUser, getBalance, transferTokens, deductTokens } from "@/lib/solana/token-service";

async function main(): Promise<void> {
  const wallet = generateWallet();
  console.info(`Generated user wallet : ${wallet.address}`);
  console.info(`Current user balance : ${await getBalance(wallet.address)}`);

  await rewardUser(wallet.address, 50);
  console.info(`Current user balance : ${await getBalance(wallet.address)}`);
 
  // 3. Check balance
  const bal = await getBalance(wallet.address);
  console.info(`Current user balance : ${await getBalance(wallet.address)}`);
 
  // 4. Transfer tokens to another wallet
  const recipient = generateWallet();

  console.info(`Current recipient balance : ${await getBalance(recipient.address)}`);
  console.info(`Current sender balance : ${await getBalance(wallet.address)}`);

  const userKeypair = keypairFromEncrypted(wallet.encryptedPrivateKey);
  await transferTokens(userKeypair, recipient.address, 10); // send 10 ECO

  console.info(`Current recipient balance : ${await getBalance(recipient.address)}`);
  console.info(`Current sender balance : ${await getBalance(wallet.address)}`);
 
  // 5. Deduct / burn tokens (redemption)
  await deductTokens(userKeypair, 5); // burn 5 ECO
 
  // 6. Final balance
  console.log("Final balance:", await getBalance(wallet.address)); // 35
}

main().catch(console.error);