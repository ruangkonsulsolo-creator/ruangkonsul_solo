// Midtrans SDK wrapper
// npm install midtrans-client

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const midtransConfig = {
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
};

/**
 * Buat Midtrans SNAP transaction token.
 * @param orderId - order_number dari tabel orders (KLB-YYYYMMDD-XXXX)
 * @param grossAmount - harga dalam Rupiah (integer)
 * @param customerDetails - nama, email, phone user
 */
export async function createSnapToken(params: {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    firstName: string;
    email: string;
    phone?: string;
  };
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}): Promise<{ token: string; redirectUrl: string }> {
  // TODO: implementasi dengan midtrans-client SDK
  throw new Error("Not implemented");
}
