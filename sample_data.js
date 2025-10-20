// Datos de ejemplo: empleados, clientes, inventario
(function(){
  const seed = {
    empleados: [],
    clientes: [],
    items: [],
    ventas: [],
    compras: [],
    movimientos: [],
    asientos: []
  };

  // 15 empleados
  for(let i=1;i<=15;i++){
    seed.empleados.push({id:i,nombre:`Empleado ${i}`,cargo: i%2? 'Produccion':'Administracion'});
  }

  // 100 clientes
  for(let i=1;i<=100;i++){
    seed.clientes.push({id:i,nombre:`Cliente ${i}`,telefono:`+5939${100000+i}`,direccion:`Ciudad ${Math.ceil(i/10)}`});
  }

  // 30 items de inventario (frutas/vegetales)
  const productos = ['Tomate','Papa','Zanahoria','Lechuga','Pepino','Cebolla','Ajo','Pimiento','Banana','Piña','Mango','Naranja','Lima','Limon','Fresa','Uva','Melon','Sandia','Brocoli','Coliflor','Espinaca','Repollo','Apio','Perejil','Cilantro','Remolacha','Berenjena','Calabaza','Camote','Arroz'];
  let id=1;
  for(const p of productos){
    seed.items.push({id:id, nombre:p, unidad: ['kg','kg','kg','kg','kg'][Math.floor(Math.random()*5)], precio: +(Math.random()*3+0.5).toFixed(2), stock: Math.floor(Math.random()*200)});
    id++;
  }

  // Guardar en localStorage si no existe
  if(!localStorage.getItem('sistema')){
    localStorage.setItem('sistema', JSON.stringify(seed));
    console.log('Seed data inicializada');
  } else {
    console.log('Datos ya presentes en localStorage');
  }
})();
