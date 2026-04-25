import { reverseGeocode } from "@/utils/geocode";

async function main(): Promise<void> {
  const location = await reverseGeocode(12, 13.5);

  console.info(location);
}

main().catch(console.error);