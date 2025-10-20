// app.js - manejo simple del sistema usando localStorage
(function(){
  const stateKey = 'sistema';
  function load(){ return JSON.parse(localStorage.getItem(stateKey) || '{}'); }
  function save(s){ localStorage.setItem(stateKey, JSON.stringify(s)); }

  // UI helpers
  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Navegación
  qsa('nav button').forEach(btn=>btn.addEventListener('click', ()=>{
    qsa('nav button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    qsa('.section').forEach(s=>s.classList.remove('active'));
    qs('#'+btn.dataset.section).classList.add('active');
    render();
  }));

  // Inicialización de UI y eventos
  function render(){
    const s = load();
    // Dashboard
    qs('#card-clientes').textContent = (s.clientes||[]).length;
    qs('#card-empleados').textContent = (s.empleados||[]).length;
    qs('#card-inventario').textContent = (s.items||[]).length;
    qs('#card-ventas-hoy').textContent = (s.ventas||[]).filter(v=>{
      const d = new Date(v.fecha); const today = new Date();
      return d.toDateString()===today.toDateString();
    }).length;

    // Llenar selects
    const clientes = s.clientes||[];
    const items = s.items||[];
    const ventaCliente = qs('#venta-cliente'); ventaCliente.innerHTML='';
    clientes.forEach(c=>{ const opt=document.createElement('option'); opt.value=c.id; opt.textContent=c.nombre; ventaCliente.appendChild(opt); });

    const ventaProducto = qs('#venta-producto'); ventaProducto.innerHTML='';
    items.forEach(it=>{ const opt=document.createElement('option'); opt.value=it.id; opt.textContent=`${it.nombre} ($${it.precio}) [stock:${it.stock}]`; ventaProducto.appendChild(opt); });

    const compraProducto = qs('#compra-producto'); compraProducto.innerHTML='';
    items.forEach(it=>{ const opt=document.createElement('option'); opt.value=it.id; opt.textContent=`${it.nombre}`; compraProducto.appendChild(opt); });

    // Tabla facturas
    const tbFact = qs('#tabla-facturas tbody'); tbFact.innerHTML='';
    (s.ventas||[]).forEach(v=>{
      const tr = document.createElement('tr'); tr.innerHTML=`<td>${v.id}</td><td>${(clientes.find(c=>c.id==v.cliente)||{}).nombre||''}</td><td>${v.fecha}</td><td>$${v.total.toFixed(2)}</td>`;
      tbFact.appendChild(tr);
    });

    // Tabla compras
    const tbComp = qs('#tabla-compras tbody'); tbComp.innerHTML='';
    (s.compras||[]).forEach(c=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${c.id}</td><td>${c.proveedor}</td><td>${c.fecha}</td><td>$${c.total.toFixed(2)}</td>`; tbComp.appendChild(tr); });

    // Tabla items
    const tbItems = qs('#tabla-items tbody'); tbItems.innerHTML='';
    items.forEach(it=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${it.id}</td><td>${it.nombre}</td><td>${it.unidad}</td><td>$${it.precio}</td><td>${it.stock}</td>`; tbItems.appendChild(tr); });

    // Movimientos
    const tbMov = qs('#tabla-movimientos tbody'); tbMov.innerHTML='';
    (s.movimientos||[]).forEach(m=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${m.id}</td><td>${m.tipo}</td><td>${m.fecha}</td><td>${m.concepto}</td><td>$${m.monto.toFixed(2)}</td>`; tbMov.appendChild(tr); });

    // Contabilidad
    const tbAs = qs('#tabla-asientos tbody'); tbAs.innerHTML='';
    (s.asientos||[]).forEach(a=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${a.id}</td><td>${a.fecha}</td><td>${a.descripcion}</td><td>$${a.debe.toFixed(2)}</td><td>$${a.haber.toFixed(2)}</td>`; tbAs.appendChild(tr); });
    const balance = (s.movimientos||[]).reduce((acc,m)=> m.tipo==='ingreso'? acc + m.monto : acc - m.monto, 0);
    qs('#conta-balance').textContent = balance.toFixed(2);

    // Factura borrador (vacío)
    renderFacturaBorrador();
  }

  // Factura en memoria antes de guardar
  let facturaDraft = [];
  function renderFacturaBorrador(){
    const s = load();
    const tbody = qs('#factura-items tbody'); tbody.innerHTML='';
    let total = 0;
    facturaDraft.forEach((it,idx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${it.nombre}</td><td>$${it.precio}</td><td>${it.cantidad}</td><td>$${(it.precio*it.cantidad).toFixed(2)}</td><td><button data-idx="${idx}" class="quitar">Quitar</button></td>`;
      tbody.appendChild(tr);
      total += it.precio*it.cantidad;
    });
    qs('#factura-total').textContent = total.toFixed(2);
    qsa('.quitar').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.idx; facturaDraft.splice(i,1); renderFacturaBorrador(); }));
  }

  // Eventos: ventas
  qs('#form-venta').addEventListener('submit', e=>{
    e.preventDefault();
    const s = load();
    const prodId = +qs('#venta-producto').value;
    const cantidad = +qs('#venta-cantidad').value;
    if(!Number.isFinite(cantidad) || cantidad <= 0){
      alert('Ingrese una cantidad válida mayor que cero');
      return;
    }
    const item = (s.items||[]).find(i=>i.id===prodId);
    if(!item){ alert('Producto no encontrado'); return; }
    if(item.stock < cantidad){ alert('Stock insuficiente'); return; }
    facturaDraft.push({id:item.id,nombre:item.nombre,precio:item.precio,cantidad});
    renderFacturaBorrador();
  });

  qs('#guardar-factura').addEventListener('click', ()=>{
    if(facturaDraft.length===0){ alert('Factura vacía'); return; }
    const s = load();
    const id = ((s.ventas||[]).length? (s.ventas[s.ventas.length-1].id+1):1);
    const clienteId = +qs('#venta-cliente').value;
    const fecha = qs('#venta-fecha').value || new Date().toISOString().slice(0,10);
    const total = facturaDraft.reduce((acc,it)=>acc + it.precio*it.cantidad,0);
    const venta = {id, cliente:clienteId, fecha, items: facturaDraft, total};
    s.ventas = s.ventas || [];
    s.ventas.push(venta);
    // descontar stock
    facturaDraft.forEach(it=>{ const item = s.items.find(x=>x.id===it.id); if(item) item.stock -= it.cantidad; });
    save(s);
    facturaDraft = [];
    render();
    alert('Factura guardada');
  });

  // Compras
  qs('#form-compra').addEventListener('submit', e=>{
    e.preventDefault();
    const s = load();
    const prodId = +qs('#compra-producto').value;
    const cantidad = +qs('#compra-cantidad').value;
    if(!Number.isFinite(cantidad) || cantidad <= 0){
      alert('Ingrese una cantidad de compra válida mayor que cero');
      return;
    }
    const precio = +qs('#compra-precio').value;
    if(!Number.isFinite(precio) || precio <= 0){
      alert('Ingrese un precio unitario válido mayor que cero');
      return;
    }
    const proveedor = qs('#compra-proveedor').value || 'Proveedor';
    const fecha = qs('#compra-fecha').value || new Date().toISOString().slice(0,10);
    const id = ((s.compras||[]).length? (s.compras[s.compras.length-1].id+1):1);
    const total = cantidad*precio;
    const compra = {id, proveedor, fecha, items:[{id:prodId,cantidad,precio}], total};
    s.compras = s.compras || [];
    s.compras.push(compra);
    // añadir stock
    const item = s.items.find(x=>x.id===prodId);
    if(item) item.stock += cantidad;
    save(s);
    render();
    alert('Compra registrada');
  });

  // Tesorería
  qs('#form-movimiento').addEventListener('submit', e=>{
    e.preventDefault();
    const s = load();
    const tipo = qs('#movimiento-tipo').value;
    const fecha = qs('#movimiento-fecha').value || new Date().toISOString().slice(0,10);
    const concepto = qs('#movimiento-concepto').value || '';
    const monto = +qs('#movimiento-monto').value;
    if(!Number.isFinite(monto) || monto <= 0){
      alert('Ingrese un monto válido mayor que cero');
      return;
    }
    const id = ((s.movimientos||[]).length? (s.movimientos[s.movimientos.length-1].id+1):1);
    const m = {id,tipo,fecha,concepto,monto};
    s.movimientos = s.movimientos || [];
    s.movimientos.push(m);
    // crear asiento simple
    s.asientos = s.asientos || [];
    const aId = ((s.asientos.length)? (s.asientos[s.asientos.length-1].id+1):1);
    if(tipo==='ingreso') s.asientos.push({id:aId,fecha,descripcion:concepto,debe:monto,haber:0}); else s.asientos.push({id:aId,fecha,descripcion:concepto,debe:0,haber:monto});
    save(s);
    render();
    alert('Movimiento registrado');
  });

  // Inventario: crear item
  qs('#btn-crear-item').addEventListener('click', ()=>{ qs('#form-item-container').classList.toggle('hidden'); });
  qs('#form-item').addEventListener('submit', e=>{
    e.preventDefault();
    const s = load();
    s.items = s.items || [];
    const id = (s.items.length? (s.items[s.items.length-1].id+1):1);
    const nombre = qs('#item-nombre').value; const unidad = qs('#item-unidad').value || 'kg';
    const precio = +qs('#item-precio').value; const stock = +qs('#item-stock').value;
    s.items.push({id,nombre,unidad,precio,stock});
    save(s);
    qs('#form-item').reset(); qs('#form-item-container').classList.add('hidden');
    render();
    alert('Item creado');
  });

  // Reportes
  qs('#reporte-ventas').addEventListener('click', ()=>{
    const s = load();
    const since = new Date(); since.setDate(since.getDate()-30);
    const ventas = (s.ventas||[]).filter(v=> new Date(v.fecha) >= since);
    const out = `Ventas últimos 30 días: ${ventas.length} | Total: $${ventas.reduce((a,b)=>a+b.total,0).toFixed(2)}`;
    qs('#report-output').textContent = out;
  });
  qs('#reporte-inventario').addEventListener('click', ()=>{
    const s = load();
    const bajos = (s.items||[]).filter(i=>i.stock<10);
    qs('#report-output').innerHTML = `<h4>Items con stock bajo</h4><ul>${bajos.map(b=>`<li>${b.nombre} - ${b.stock}</li>`).join('')}</ul>`;
  });

  // Carga inicial
  document.addEventListener('DOMContentLoaded', ()=>{
    // si no hay datos, sample_data.js ya los puso
    render();
    // poner fecha por defecto en forms
    const hoy = new Date().toISOString().slice(0,10);
    ['#venta-fecha','#compra-fecha','#movimiento-fecha'].forEach(s=>{ if(qs(s)) qs(s).value = hoy; });
  });
})();
