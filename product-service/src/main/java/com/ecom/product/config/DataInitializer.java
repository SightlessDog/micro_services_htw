package com.ecom.product.config;

import com.ecom.product.model.Product;
import com.ecom.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    @Bean
    CommandLineRunner seedProducts(ProductRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.saveAll(List.of(
                    product("Laptop Pro 15", "High-performance laptop", new BigDecimal("1299.99"), 50, "Electronics"),
                    product("Wireless Headphones", "Noise-cancelling over-ear", new BigDecimal("199.99"), 120, "Electronics"),
                    product("Mechanical Keyboard", "TKL RGB mechanical keyboard", new BigDecimal("89.99"), 200, "Electronics"),
                    product("Running Shoes", "Lightweight trail runner", new BigDecimal("119.99"), 80, "Footwear"),
                    product("Coffee Maker", "12-cup programmable brewer", new BigDecimal("59.99"), 60, "Kitchen"),
                    product("Yoga Mat", "Non-slip premium yoga mat", new BigDecimal("34.99"), 150, "Sports")
                ));
            }
        };
    }

    private Product product(String name, String desc, BigDecimal price, int stock, String cat) {
        Product p = new Product();
        p.setName(name);
        p.setDescription(desc);
        p.setPrice(price);
        p.setStock(stock);
        p.setCategory(cat);
        return p;
    }
}
