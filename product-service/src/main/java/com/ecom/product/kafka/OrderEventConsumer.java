package com.ecom.product.kafka;

import com.ecom.product.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final ProductService productService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "order.placed", groupId = "product-service")
    public void handleOrderPlaced(String message) {
        try {
            OrderPlacedEvent event = objectMapper.readValue(message, OrderPlacedEvent.class);
            for (OrderPlacedEvent.OrderItem item : event.getItems()) {
                productService.decrementStock(item.getProductId(), item.getQuantity());
                log.info("Decremented stock for product {} by {} (order {})",
                        item.getProductId(), item.getQuantity(), event.getOrderId());
            }
        } catch (Exception e) {
            log.error("Failed to process order.placed event: {}", e.getMessage(), e);
        }
    }
}
