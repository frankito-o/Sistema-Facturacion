// app.js - manejo simple del sistema usando localStorage
(function(){
  const stateKey = 'sistema';
  const IVA_RATE = 0.21;
  const IVA_LABEL = `${Math.round(IVA_RATE*100)}%`;
  const PUNTO_VENTA = '0001';
  function load(){ return JSON.parse(localStorage.getItem(stateKey) || '{}'); }
  function save(s){ localStorage.setItem(stateKey, JSON.stringify(s)); }
  function roundTwo(n){ return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
  const currencyFormatter = new Intl.NumberFormat('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
  function formatCurrency(n){ return currencyFormatter.format(roundTwo(n)); }
  function calcularTotales(items, tipo){
    const neto = roundTwo((items||[]).reduce((acc,it)=> acc + (Number(it.precio)||0) * (Number(it.cantidad)||0), 0));
    const iva = roundTwo(neto * IVA_RATE);
    const total = roundTwo(tipo === 'A' ? neto + iva : neto + iva);
    return {neto, iva, total};
  }
  function precioUnitarioParaMostrar(item, tipo){
    const base = Number(item.precio)||0;
    return roundTwo(tipo === 'A' ? base : base * (1+IVA_RATE));
  }
  function generarCAE(){
    let code='';
    for(let i=0;i<14;i++){ code += Math.floor(Math.random()*10); }
    return code;
  }
  function descargarFacturaPDF(venta, cliente){
    if(!window.jspdf || !window.jspdf.jsPDF){
      alert('No se pudo cargar la librería para exportar a PDF.');
      return;
    }
    const doc = new window.jspdf.jsPDF({unit:'pt', format:'a4'});
    let y = 40;
    const tipo = venta.tipo || 'B';
    const clienteNombre = (cliente && cliente.nombre) ? cliente.nombre : 'Consumidor Final';
    doc.setFontSize(16);
    doc.text(`Factura Tipo ${tipo}`, 40, y);
    y += 24;
    doc.setFontSize(11);
    doc.text(`Punto de Venta: ${venta.puntoVenta || PUNTO_VENTA}`, 40, y);
    y += 14;
    doc.text(`CAE: ${venta.cae || 'Pendiente'}`, 40, y);
    y += 20;
    doc.text(`Fecha de Emisión: ${venta.fecha}`, 40, y);
    y += 14;
    doc.text(`Cliente: ${clienteNombre}`, 40, y);
    y += 14;
    if(cliente && cliente.direccion){
      doc.text(`Domicilio: ${cliente.direccion}`, 40, y);
      y += 14;
    }
    const condicionIVA = tipo === 'A' ? 'Responsable Inscripto' : 'Consumidor Final / Monotributo';
    doc.text(`Condición frente al IVA: ${condicionIVA}`, 40, y);
    y += 24;
    doc.setFontSize(12);
    doc.text('Detalle de Items', 40, y);
    y += 16;
    doc.setFontSize(10);
    const colProducto = 40;
    const colCantidad = 320;
    const colPrecio = 380;
    const colSubtotal = 470;
    doc.text('Producto', colProducto, y);
    doc.text('Cant.', colCantidad, y, {align:'right'});
    doc.text('P. Unit.', colPrecio, y, {align:'right'});
    doc.text('Subtotal', colSubtotal, y, {align:'right'});
    y += 6;
    doc.line(40, y, 520, y);
    y += 12;
    (venta.items||[]).forEach(it=>{
      const precioUnit = precioUnitarioParaMostrar(it, tipo);
      const subtotal = roundTwo(precioUnit * (Number(it.cantidad)||0));
      const cantidadTexto = it.unidad ? `${it.cantidad} ${it.unidad}` : String(it.cantidad);
      doc.text(String(it.nombre), colProducto, y);
      doc.text(cantidadTexto, colCantidad, y, {align:'right'});
      doc.text(`$${formatCurrency(precioUnit)}`, colPrecio, y, {align:'right'});
      doc.text(`$${formatCurrency(subtotal)}`, colSubtotal, y, {align:'right'});
      y += 14;
      if(y > 700){
        doc.addPage();
        y = 40;
      }
    });
    if(y > 660){
      doc.addPage();
      y = 40;
    } else {
      y += 10;
    }
    const totalesCalculados = calcularTotales(venta.items||[], tipo);
    const tieneIVARegistrado = Number.isFinite(venta.iva);
    const neto = Number.isFinite(venta.neto) ? venta.neto : totalesCalculados.neto;
    const iva = tieneIVARegistrado ? venta.iva : totalesCalculados.iva;
    const total = (tieneIVARegistrado && Number.isFinite(venta.total)) ? venta.total : totalesCalculados.total;
    doc.setFontSize(11);
    doc.text(`Neto Gravado: $${formatCurrency(neto)}`, colSubtotal, y, {align:'right'});
    y += 16;
    doc.text(`IVA (${IVA_LABEL}): $${formatCurrency(iva)}`, colSubtotal, y, {align:'right'});
    y += 18;
    doc.setFontSize(13);
    doc.text(`Total: $${formatCurrency(total)}`, colSubtotal, y, {align:'right'});
    y += 30;
    doc.setFontSize(9);
    doc.text('Documento emitido conforme a la Ley de Comercio de la República Argentina.', 40, y);
    doc.save(`Factura-${tipo}-${venta.id}.pdf`);
  }

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
    let needsSave = false;
    (s.ventas||[]).forEach(v=>{
      if(!v.tipo){ v.tipo = 'B'; needsSave = true; }
      const tipoActual = v.tipo || 'B';
      const totalesAsegurados = calcularTotales(v.items||[], tipoActual);
      if(!Number.isFinite(v.neto) || Math.abs(v.neto - totalesAsegurados.neto) > 0.009){ v.neto = totalesAsegurados.neto; needsSave = true; }
      if(!Number.isFinite(v.iva) || Math.abs(v.iva - totalesAsegurados.iva) > 0.009){ v.iva = totalesAsegurados.iva; needsSave = true; }
      if(!Number.isFinite(v.total) || Math.abs(v.total - totalesAsegurados.total) > 0.009){ v.total = totalesAsegurados.total; needsSave = true; }
      if(!v.puntoVenta){ v.puntoVenta = PUNTO_VENTA; needsSave = true; }
      if(!v.cae){ v.cae = generarCAE(); needsSave = true; }
    });
    if(needsSave) save(s);
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
    const tbFact = qs('#tabla-facturas tbody'); if(tbFact) tbFact.innerHTML='';
    (s.ventas||[]).forEach(v=>{
      const cliente = (clientes.find(c=>c.id==v.cliente)||{});
      const tipo = v.tipo || 'B';
      const recalculados = calcularTotales(v.items||[], tipo);
      const tieneIVARegistrado = Number.isFinite(v.iva);
      const totales = {
        neto: Number.isFinite(v.neto) ? v.neto : recalculados.neto,
        iva: tieneIVARegistrado ? v.iva : recalculados.iva,
        total: (tieneIVARegistrado && Number.isFinite(v.total)) ? v.total : recalculados.total
      };
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${v.id}</td><td>${cliente.nombre||''}</td><td>${v.fecha}</td><td>${tipo}</td><td>$${formatCurrency(totales.total)}</td><td><button data-id="${v.id}" class="descargar-pdf">Descargar PDF</button></td>`;
      if(tbFact) tbFact.appendChild(tr);
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
    const tipo = qs('#venta-tipo') ? qs('#venta-tipo').value : 'B';
    const tbody = qs('#factura-items tbody'); if(tbody) tbody.innerHTML='';
    facturaDraft.forEach((it,idx)=>{
      const tr = document.createElement('tr');
      const precioUnitario = precioUnitarioParaMostrar(it, tipo);
      const subtotal = roundTwo(precioUnitario * (Number(it.cantidad)||0));
      tr.innerHTML = `<td>${it.nombre}</td><td>$${formatCurrency(precioUnitario)}</td><td>${it.cantidad}</td><td>$${formatCurrency(subtotal)}</td><td><button data-idx="${idx}" class="quitar">Quitar</button></td>`;
      if(tbody) tbody.appendChild(tr);
    });
    const totales = calcularTotales(facturaDraft, tipo);
    if(qs('#factura-neto')) qs('#factura-neto').textContent = formatCurrency(totales.neto);
    if(qs('#factura-iva')) qs('#factura-iva').textContent = formatCurrency(totales.iva);
    if(qs('#factura-total')) qs('#factura-total').textContent = formatCurrency(totales.total);
    if(qs('#factura-iva-rate')) qs('#factura-iva-rate').textContent = IVA_LABEL;
    qsa('#factura-items .quitar').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.idx; facturaDraft.splice(i,1); renderFacturaBorrador(); }));
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
    facturaDraft.push({id:item.id,nombre:item.nombre,precio:Number(item.precio),cantidad,unidad:item.unidad});
    renderFacturaBorrador();
  });

  if(qs('#venta-tipo')){
    qs('#venta-tipo').addEventListener('change', ()=>{
      renderFacturaBorrador();
    });
  }

  qs('#guardar-factura').addEventListener('click', ()=>{
    if(facturaDraft.length===0){ alert('Factura vacía'); return; }
    const s = load();
    const id = ((s.ventas||[]).length? (s.ventas[s.ventas.length-1].id+1):1);
    const clienteId = +qs('#venta-cliente').value;
    const fecha = qs('#venta-fecha').value || new Date().toISOString().slice(0,10);
    const tipoFactura = (qs('#venta-tipo') ? qs('#venta-tipo').value : 'B') || 'B';
    const totales = calcularTotales(facturaDraft, tipoFactura);
    const itemsFactura = facturaDraft.map(it=>({id:it.id,nombre:it.nombre,precio:it.precio,cantidad:it.cantidad,unidad:it.unidad}));
    const venta = {id, cliente:clienteId, fecha, tipo:tipoFactura, items: itemsFactura, neto: totales.neto, iva: totales.iva, total: totales.total, cae: generarCAE(), puntoVenta: PUNTO_VENTA};
    s.ventas = s.ventas || [];
    s.ventas.push(venta);
    // descontar stock
    facturaDraft.forEach(it=>{ const item = s.items.find(x=>x.id===it.id); if(item) item.stock -= it.cantidad; });
    save(s);
    facturaDraft = [];
    render();
    alert('Factura guardada');
  });

  const tablaFacturas = qs('#tabla-facturas');
  if(tablaFacturas){
    tablaFacturas.addEventListener('click', e=>{
      const btn = e.target.closest('.descargar-pdf');
      if(!btn) return;
      const ventaId = +btn.dataset.id;
      const s = load();
      const venta = (s.ventas||[]).find(v=>v.id===ventaId);
      if(!venta){ alert('Factura no encontrada'); return; }
      const cliente = (s.clientes||[]).find(c=>c.id===venta.cliente);
      descargarFacturaPDF(venta, cliente);
    });
  }

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
    const totalPeriodo = ventas.reduce((acc,v)=>{
      const tipo = v.tipo || 'B';
      const totales = calcularTotales(v.items||[], tipo);
      const totalVigente = Number.isFinite(v.total) && Math.abs(v.total - totales.total) <= 0.009 ? v.total : totales.total;
      return acc + totalVigente;
    }, 0);
    const out = `Ventas últimos 30 días: ${ventas.length} | Total: $${formatCurrency(totalPeriodo)}`;
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
