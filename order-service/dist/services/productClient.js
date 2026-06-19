"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProduct = getProduct;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.PRODUCT_SERVICE_URL || "http://product-service:8081";
async function getProduct(productId) {
    const res = await axios_1.default.get(`${BASE_URL}/products/${productId}`);
    return res.data;
}
//# sourceMappingURL=productClient.js.map