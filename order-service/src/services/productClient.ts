import axios from "axios";

const BASE_URL = process.env.PRODUCT_SERVICE_URL || "http://product-service:8081";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}

export async function getProduct(productId: number | string): Promise<Product> {
  const res = await axios.get<Product>(`${BASE_URL}/products/${productId}`, { timeout: 5_000 });
  return res.data;
}
