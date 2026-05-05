const axios = require("axios");

const BASE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://product-service:8081";

async function getProduct(productId) {
  const res = await axios.get(`${BASE_URL}/products/${productId}`);

  return Promise.resolve(res.data);
}

async function decrementStock(productId, quantity) {
  const res = await axios.patch(
    `${BASE_URL}/products/${productId}/decrement-stock`,
    { quantity },
  );
  return res.data;
}

module.exports = { getProduct, decrementStock };
