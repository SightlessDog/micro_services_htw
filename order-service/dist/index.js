"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orders_1 = __importDefault(require("./routes/orders"));
const kafka_1 = require("./kafka");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order-service" });
});
app.use("/orders", orders_1.default);
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});
(0, kafka_1.connectProducer)()
    .then(() => {
    app.listen(PORT, () => {
        console.log(`Order service running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map