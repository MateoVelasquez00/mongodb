package com.proyecto.mongodb.repositorio;

import com.proyecto.mongodb.modelo.Producto;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProductoRepositorio extends MongoRepository<Producto, String> {
    
    // Busca productos cuyo nombre contenga el texto (insensible a mayúsculas)
    List<Producto> findByNombreContainingIgnoreCase(String nombre);
    
    // Filtra por estado (activo/inactivo)
    List<Producto> findByEstado(Boolean estado);
}