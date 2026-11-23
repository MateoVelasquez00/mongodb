package com.proyecto.mongodb.controlador;

import com.proyecto.mongodb.modelo.Producto;
import com.proyecto.mongodb.repositorio.ProductoRepositorio;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/productos")
@CrossOrigin(origins = "*")
public class ProductoControlador {
    
    @Autowired
    private ProductoRepositorio repositorio;
    
    // 1. LISTAR TODOS
    @GetMapping
    public List<Producto> listarTodos() {
        return repositorio.findAll();
    }
    
    // 2. BUSCAR POR ID
    @GetMapping("/{id}")
    public ResponseEntity<Producto> buscarPorId(@PathVariable String id) {
        return repositorio.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    // 3. BUSCAR POR NOMBRE (?nombre=teclado)
    @GetMapping("/buscar")
    public List<Producto> buscarPorNombre(@RequestParam String nombre) {
        return repositorio.findByNombreContainingIgnoreCase(nombre);
    }
    
    // 4. AGREGAR NUEVO PRODUCTO
    @PostMapping
    public ResponseEntity<Producto> guardarProducto(@RequestBody Producto producto) {
        if (producto.getEstado() == null) {
            producto.setEstado(true); // Activo por defecto si no se envía
        }
        Producto guardado = repositorio.save(producto);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }
    
    // 5. ACTUALIZAR PRODUCTO COMPLETO
    @PutMapping("/{id}")
    public ResponseEntity<Producto> actualizarProducto(@PathVariable String id, @RequestBody Producto datosNuevos) {
        Optional<Producto> productoOpt = repositorio.findById(id);
        
        if (productoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Producto productoExistente = productoOpt.get();
        productoExistente.setNombre(datosNuevos.getNombre());
        productoExistente.setStock(datosNuevos.getStock());
        productoExistente.setCategoria_id(datosNuevos.getCategoria_id());
        if (datosNuevos.getEstado() != null) {
            productoExistente.setEstado(datosNuevos.getEstado());
        }
        
        return ResponseEntity.ok(repositorio.save(productoExistente));
    }
    
    // 6. CAMBIAR ESTADO (Activo <-> Inactivo)
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Producto> cambiarEstado(@PathVariable String id) {
        Optional<Producto> productoOpt = repositorio.findById(id);
        
        if (productoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Producto producto = productoOpt.get();
        boolean estadoActual = Boolean.TRUE.equals(producto.getEstado());
        producto.setEstado(!estadoActual);
        
        return ResponseEntity.ok(repositorio.save(producto));
    }
    
    // 7. ELIMINAR PRODUCTO
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarProducto(@PathVariable String id) {
        if (!repositorio.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repositorio.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}