-- Orders are looked up by userId on every "my orders" request; index to
-- avoid a full table scan as the table grows.
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");
