package com.ecom.product.service;

import com.ecom.product.dto.ProductRequest;
import com.ecom.product.model.Product;
import com.ecom.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository repository;

    public List<Product> findAll(String category, String search) {
        if (category != null && !category.isBlank()) {
            return repository.findByCategory(category);
        }
        if (search != null && !search.isBlank()) {
            return repository.findByNameContainingIgnoreCase(search);
        }
        return repository.findAll();
    }

    public Product findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product not found: " + id));
    }

    public Product create(ProductRequest req) {
        Product product = new Product();
        product.setName(req.getName());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setStock(req.getStock());
        product.setCategory(req.getCategory());
        return repository.save(product);
    }

    public Product update(Long id, ProductRequest req) {
        Product product = findById(id);
        product.setName(req.getName());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setStock(req.getStock());
        product.setCategory(req.getCategory());
        return repository.save(product);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Product not found: " + id);
        }
        repository.deleteById(id);
    }

    public Product decrementStock(Long id, int quantity) {
        Product product = findById(id);
        if (product.getStock() < quantity) {
            throw new IllegalStateException("Insufficient stock for product: " + id);
        }
        product.setStock(product.getStock() - quantity);
        return repository.save(product);
    }
}
