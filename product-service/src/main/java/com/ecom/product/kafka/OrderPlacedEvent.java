package com.ecom.product.kafka;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class OrderPlacedEvent {
    private String orderId;
    private Integer userId;
    private String userEmail;
    private List<OrderItem> items;
    private BigDecimal total;
    private String createdAt;

    @Data
    public static class OrderItem {
        @JsonProperty("product_id")
        private Long productId;
        private String name;
        private Integer quantity;
        @JsonProperty("unit_price")
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
}
