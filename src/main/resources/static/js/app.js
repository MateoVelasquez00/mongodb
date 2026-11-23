const API_URL = '/api/productos';
let productosCache = [];
let timerBusqueda = null;

// Inicializar eventos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    // Botones principales
    document.getElementById('btnNuevoProducto').addEventListener('click', abrirModalCrear);
    document.getElementById('btnRecargar').addEventListener('click', cargarProductos);
    document.getElementById('btnCerrarModalX').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);

    // Formulario modal
    document.getElementById('formProducto').addEventListener('submit', guardarProducto);

    // Cambio visual de etiqueta del switch en el modal
    document.getElementById('prodEstado').addEventListener('change', (e) => {
        const lbl = document.getElementById('labelEstadoModal');
        lbl.textContent = e.target.checked ? 'Activo' : 'Inactivo';
        lbl.className = e.target.checked
            ? 'ms-2 text-xs font-semibold text-emerald-600'
            : 'ms-2 text-xs font-semibold text-slate-400';
    });

    // Filtro por estado
    document.getElementById('filtroEstado').addEventListener('change', aplicarFiltroLocal);

    // Búsqueda dinámica con debounce (300ms)
    document.getElementById('inputBuscar').addEventListener('input', (e) => {
        clearTimeout(timerBusqueda);
        const termino = e.target.value.trim();
        timerBusqueda = setTimeout(() => buscarProductos(termino), 300);
    });

    // Delegación de eventos para botones dentro de la tabla (Estado, Editar, Eliminar)
    document.getElementById('tablaProductos').addEventListener('click', (e) => {
        const btnEstado = e.target.closest('[data-action="estado"]');
        const btnEditar = e.target.closest('[data-action="editar"]');
        const btnEliminar = e.target.closest('[data-action="eliminar"]');

        if (btnEstado) {
            cambiarEstado(btnEstado.dataset.id);
        } else if (btnEditar) {
            const producto = productosCache.find(p => p.id === btnEditar.dataset.id);
            if (producto) abrirModalEditar(producto);
        } else if (btnEliminar) {
            eliminarProducto(btnEliminar.dataset.id, btnEliminar.dataset.nombre);
        }
    });
});

// 1. LISTAR TODOS
async function cargarProductos() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Error al conectar con el servidor');
        productosCache = await res.json();
        actualizarEstadisticas(productosCache);
        aplicarFiltroLocal();
    } catch (err) {
        mostrarToast(err.message, true);
    }
}

// 2. BUSCAR POR NOMBRE O ID EN BACKEND
async function buscarProductos(termino) {
    if (!termino) {
        return cargarProductos();
    }
    try {
        const resNombre = await fetch(`${API_URL}/buscar?nombre=${encodeURIComponent(termino)}`);
        let resultados = await resNombre.json();

        // Si no hay coincidencias por nombre y parece un ObjectId, busca por ID exacto
        if (resultados.length === 0 && termino.length >= 12) {
            const resId = await fetch(`${API_URL}/${encodeURIComponent(termino)}`);
            if (resId.ok) {
                const prod = await resId.json();
                resultados = [prod];
            }
        }
        productosCache = resultados;
        aplicarFiltroLocal();
    } catch (err) {
        mostrarToast('Error en la búsqueda', true);
    }
}

function aplicarFiltroLocal() {
    const filtro = document.getElementById('filtroEstado').value;
    let lista = productosCache;
    if (filtro !== 'todos') {
        const estadoBool = filtro === 'true';
        lista = productosCache.filter(p => Boolean(p.estado) === estadoBool);
    }
    renderizarTabla(lista);
}

function renderizarTabla(productos) {
    const tbody = document.getElementById('tablaProductos');
    if (productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                    <i class="fa-regular fa-folder-open text-3xl mb-2 block"></i>
                    No se encontraron productos registrados.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = productos.map(p => {
        const activo = Boolean(p.estado);
        const stockBajo = (p.stock ?? 0) <= 5;
        return `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-5 font-mono text-xs text-slate-400" title="${p.id}">
                ${p.id ? p.id.substring(0, 10) + '...' : 'N/A'}
            </td>
            <td class="py-3.5 px-5 font-semibold text-slate-800">${escapeHtml(p.nombre)}</td>
            <td class="py-3.5 px-5">
                <span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">
                    ${escapeHtml(p.categoria_id || 'Sin categoría')}
                </span>
            </td>
            <td class="py-3.5 px-5 text-center">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${stockBajo ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}">
                    ${p.stock ?? 0} uds
                </span>
            </td>
            <td class="py-3.5 px-5 text-center">
                <button data-action="estado" data-id="${p.id}" title="Clic para cambiar estado"
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}">
                    <span class="w-2 h-2 rounded-full ${activo ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                    ${activo ? 'Activo' : 'Inactivo'}
                </button>
            </td>
            <td class="py-3.5 px-5 text-right space-x-1">
                <button data-action="editar" data-id="${p.id}" title="Editar"
                    class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button data-action="eliminar" data-id="${p.id}" data-nombre="${escapeHtml(p.nombre)}" title="Eliminar"
                    class="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// 3 & 4. CREAR (POST) O ACTUALIZAR (PUT)
async function guardarProducto(e) {
    e.preventDefault();
    const id = document.getElementById('prodId').value;
    const payload = {
        nombre: document.getElementById('prodNombre').value.trim(),
        stock: parseInt(document.getElementById('prodStock').value, 10),
        categoria_id: document.getElementById('prodCategoria').value.trim(),
        estado: document.getElementById('prodEstado').checked
    };

    const esEdicion = Boolean(id);
    const url = esEdicion ? `${API_URL}/${id}` : API_URL;
    const metodo = esEdicion ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('No se pudo guardar el producto');

        cerrarModal();
        mostrarToast(esEdicion ? 'Producto actualizado' : 'Producto creado');
        cargarProductos();
    } catch (err) {
        mostrarToast(err.message, true);
    }
}

// 5. CAMBIAR ESTADO (PATCH)
async function cambiarEstado(id) {
    try {
        const res = await fetch(`${API_URL}/${id}/estado`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Error al cambiar estado');
        mostrarToast('Estado actualizado');
        cargarProductos();
    } catch (err) {
        mostrarToast(err.message, true);
    }
}

// 6. ELIMINAR (DELETE)
async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Seguro que deseas eliminar "${nombre}"?`)) return;
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar producto');
        mostrarToast('Producto eliminado');
        cargarProductos();
    } catch (err) {
        mostrarToast(err.message, true);
    }
}

// Utilidades UI
function actualizarEstadisticas(lista) {
    document.getElementById('statTotal').textContent = lista.length;
    document.getElementById('statActivos').textContent = lista.filter(p => p.estado).length;
    document.getElementById('statStock').textContent = lista.reduce((acc, p) => acc + (p.stock || 0), 0);
}

function abrirModalCrear() {
    document.getElementById('formProducto').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodEstado').checked = true;
    document.getElementById('prodEstado').dispatchEvent(new Event('change'));
    document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
    toggleModal(true);
}

function abrirModalEditar(prod) {
    document.getElementById('prodId').value = prod.id;
    document.getElementById('prodNombre').value = prod.nombre || '';
    document.getElementById('prodStock').value = prod.stock ?? 0;
    document.getElementById('prodCategoria').value = prod.categoria_id || '';
    document.getElementById('prodEstado').checked = Boolean(prod.estado);
    document.getElementById('prodEstado').dispatchEvent(new Event('change'));
    document.getElementById('modalTitulo').textContent = 'Editar Producto';
    toggleModal(true);
}

function cerrarModal() {
    toggleModal(false);
}

function toggleModal(mostrar) {
    const modal = document.getElementById('modalProducto');
    modal.classList.toggle('hidden', !mostrar);
    modal.classList.toggle('flex', mostrar);
}

function mostrarToast(mensaje, esError = false) {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastMsg').textContent = mensaje;
    icon.className = esError
        ? 'fa-solid fa-circle-exclamation text-rose-400'
        : 'fa-solid fa-circle-check text-emerald-400';
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}