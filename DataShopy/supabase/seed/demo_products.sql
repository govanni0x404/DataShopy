-- Datos DE PRUEBA: productos con imagen para los locales reclamados de prueba
-- y 8 locales nuevos de demostración (reclamados, sin dueño).
-- Imágenes: Unsplash (uso libre). Para borrar todo lo sembrado:
--   delete from public.stores where name in ('Pizzería Bella Napoli', 'Burger House Maule', 'Café del Puente', 'Urban Sneakers', 'TechZone Linares', 'Vivero Las Hojas', 'Moda Andina', 'Farmacia Vital');  -- locales nuevos (sus productos se borran en cascada)
--   delete from public.products where store_id in (select id from public.stores where name in ('Bicicletas del Maule', 'ElectroHogar Linares', 'Lana y Tejidos Maule', 'Juanito Alcachofas', 'Choclos Baratos'));
begin;

-- Bicicletas del Maule
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Bicicletas del Maule' and claimed limit 1), 'Bicicleta urbana clásica', 'Cuadro de acero, 7 velocidades y canasto opcional. Ideal para moverse por Linares.', 249990, 289990, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Bicicletas del Maule' and claimed limit 1), 'Bicicleta de ruta aluminio', 'Cuadro de aluminio, 16 velocidades Shimano y frenos de caliper.', 459990, null, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Bicicletas del Maule' and claimed limit 1), 'Bicicleta gravel', 'Para camino y ripio: neumáticos 700x38 y frenos de disco.', 529990, 599990, 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Bicicletas del Maule' and claimed limit 1), 'Pack Bici + Mantención anual', 'Bicicleta urbana con un año de mantención gratis en nuestro taller.', 279990, 329990, 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80&fit=crop&auto=format', true, '1 bicicleta urbana, 3 mantenciones, 1 candado, 1 set de luces LED');

-- ElectroHogar Linares
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'ElectroHogar Linares' and claimed limit 1), 'Smart TV 55" 4K', 'Smart TV con Netflix, YouTube y control por voz.', 399990, 469990, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'ElectroHogar Linares' and claimed limit 1), 'Lavadora carga frontal 8 kg', '14 programas de lavado, eficiencia energética A+++.', 329990, null, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'ElectroHogar Linares' and claimed limit 1), 'Refrigerador retro 250 L', 'Diseño vintage color menta, frío directo.', 459990, null, 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'ElectroHogar Linares' and claimed limit 1), 'Licuadora 1.5 L', 'Vaso de vidrio, 5 velocidades y función pulso.', 39990, 49990, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'ElectroHogar Linares' and claimed limit 1), 'Pack Cocina Café', 'Todo para preparar café de grano en casa.', 129990, 159990, 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80&fit=crop&auto=format', true, '1 cafetera de goteo, 1 molinillo eléctrico, 1 hervidor');

-- Lana y Tejidos Maule
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Lana y Tejidos Maule' and claimed limit 1), 'Ovillo lana merino 100 g', 'Lana merino suave, disponible en 20 colores.', 4990, null, 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Lana y Tejidos Maule' and claimed limit 1), 'Pack Tejedor Principiante', 'Todo lo necesario para tu primer gorro o bufanda.', 19990, 25990, 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&q=80&fit=crop&auto=format', true, '6 ovillos de colores, 2 palillos, 1 aguja lanera, guía impresa'),
  ((select id from public.stores where name = 'Lana y Tejidos Maule' and claimed limit 1), 'Bolsa de tela cruda', 'Bolsa de algodón crudo, perfecta para llevar tus tejidos.', 6990, null, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80&fit=crop&auto=format', false, null);

-- Juanito Alcachofas
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Juanito Alcachofas' and claimed limit 1), 'Garbanzos 1 kg', 'Garbanzos nacionales seleccionados.', 2490, null, 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Juanito Alcachofas' and claimed limit 1), 'Mix de legumbres 1 kg', 'Lentejas, porotos y garbanzos en una sola bolsa.', 2990, 3490, 'https://images.unsplash.com/photo-1612257416648-ee7a6c533b4f?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Juanito Alcachofas' and claimed limit 1), 'Arroz grado 1 - 1 kg', 'Arroz grano largo grado 1.', 1590, null, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Juanito Alcachofas' and claimed limit 1), 'Pack Legumbres del Mes', 'Para cocinar legumbres todas las semanas del mes.', 11990, 14990, 'https://images.unsplash.com/photo-1612257416648-ee7a6c533b4f?w=800&q=80&fit=crop&auto=format', true, '2 kg lentejas, 2 kg porotos, 1 kg garbanzos, 1 kg arroz');

-- Choclos Baratos
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Choclos Baratos' and claimed limit 1), 'Choclo fresco (unidad)', 'Choclo de temporada, cosechado esta semana.', 500, 700, 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Choclos Baratos' and claimed limit 1), 'Malla de papas 5 kg', 'Papas nuevas de la zona.', 4990, null, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Choclos Baratos' and claimed limit 1), 'Caja de verduras surtidas', 'Verduras de temporada para toda la semana.', 9990, 12990, 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Choclos Baratos' and claimed limit 1), 'Pack Pastel de Choclo', 'Todo para un pastel de choclo para 6 personas.', 6990, 8990, 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800&q=80&fit=crop&auto=format', true, '12 choclos, 1 kg cebolla, albahaca, 1 malla de papas chica'),
  ((select id from public.stores where name = 'Choclos Baratos' and claimed limit 1), 'Caja de frutas de temporada', 'Frutas surtidas, 4 kg aprox.', 8990, null, 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80&fit=crop&auto=format', false, null);

-- Pizzería Bella Napoli
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Pizzería Bella Napoli', 'Comida', '🍕', 'Pizzas a la piedra con masa madre y delivery.', 'Independencia 620, Linares', 'Linares', 'Chile', -35.846, -71.595, '+56 9 7321 4455', '12:00 - 23:00', '12:00 - 00:00', '#F5E4D0', 'pizza, pizzería, masa madre, delivery, napolitana, comida', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Pizzería Bella Napoli' order by id desc limit 1), 'Pizza Margarita familiar', 'Salsa de tomate, mozzarella fresca y albahaca.', 11990, null, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Pizzería Bella Napoli' order by id desc limit 1), 'Pizza Pepperoni familiar', 'Doble pepperoni y mozzarella.', 13990, 15990, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Pizzería Bella Napoli' order by id desc limit 1), 'Pizza Vegetariana familiar', 'Pimentón, champiñón, cebolla morada y aceitunas.', 12990, null, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Pizzería Bella Napoli' order by id desc limit 1), 'Pack Familiar', 'Para compartir en familia.', 22990, 28970, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80&fit=crop&auto=format', true, '2 pizzas familiares a elección, 1 bebida 1.5 L');

-- Burger House Maule
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Burger House Maule', 'Comida', '🍔', 'Hamburguesas artesanales y jugos naturales.', 'Chacabuco 480, Linares', 'Linares', 'Chile', -35.847, -71.5935, '+56 9 6012 7788', '12:30 - 22:30', '13:00 - 23:30', '#FDE2E2', 'hamburguesa, burger, papas fritas, jugos, comida rápida', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Burger House Maule' order by id desc limit 1), 'Burger Clásica', 'Carne 180 g, cheddar, lechuga, tomate y salsa de la casa.', 6990, null, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Burger House Maule' order by id desc limit 1), 'Pack Dúo Burger', 'Para dos personas.', 13990, 16980, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80&fit=crop&auto=format', true, '2 burgers clásicas, 2 papas fritas, 2 bebidas'),
  ((select id from public.stores where name = 'Burger House Maule' order by id desc limit 1), 'Jugo natural 500 ml', 'Frutilla, mango, frambuesa o piña.', 2990, null, 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800&q=80&fit=crop&auto=format', false, null);

-- Café del Puente
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Café del Puente', 'Café', '☕', 'Café de especialidad, pastelería y desayunos.', 'Maipú 410, Linares', 'Linares', 'Chile', -35.8452, -71.5955, '+56 9 5544 3322', '08:00 - 20:00', '09:00 - 18:00', '#F6E3CB', 'café, latte, cappuccino, especialidad, desayuno, croissant, torta', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Café del Puente' order by id desc limit 1), 'Latte de especialidad', 'Doble espresso con leche texturizada.', 3290, null, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Café del Puente' order by id desc limit 1), 'Café en grano 250 g', 'Tostado medio, origen Colombia.', 8990, null, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Café del Puente' order by id desc limit 1), 'Croissant de mantequilla', 'Horneado cada mañana.', 1990, null, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Café del Puente' order by id desc limit 1), 'Torta de chocolate (trozo)', 'Bizcocho húmedo con ganache.', 3490, null, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Café del Puente' order by id desc limit 1), 'Pack Desayuno para dos', 'Desayuno completo para compartir.', 9990, 12560, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&fit=crop&auto=format', true, '2 lattes, 2 croissants, 1 jugo natural, 1 trozo de torta');

-- Urban Sneakers
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Urban Sneakers', 'Calzado', '👟', 'Zapatillas urbanas y deportivas de las mejores marcas.', 'O’Higgins 410, Linares', 'Linares', 'Chile', -35.8476, -71.5922, '+56 9 8877 6655', '10:00 - 20:00', '10:00 - 18:00', '#E9E4F4', 'zapatillas, sneakers, running, calzado, deportivo, urbano', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Urban Sneakers' order by id desc limit 1), 'Zapatillas running rojas', 'Livianas y con amortiguación para correr todos los días.', 59990, 79990, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Urban Sneakers' order by id desc limit 1), 'Zapatillas urbanas camel', 'Cuero sintético, suela de goma.', 64990, null, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Urban Sneakers' order by id desc limit 1), 'Zapatillas skate blancas', 'Suela plana y resistente.', 49990, null, 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80&fit=crop&auto=format', false, null);

-- TechZone Linares
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('TechZone Linares', 'Tecnología', '📱', 'Celulares, computadores y accesorios.', 'Yungay 640, Linares', 'Linares', 'Chile', -35.8474, -71.5915, '+56 9 9988 1122', '10:00 - 19:30', '10:00 - 14:00', '#DCEAFE', 'celular, smartphone, notebook, audífonos, smartwatch, tecnología, accesorios', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'TechZone Linares' order by id desc limit 1), 'Smartphone 128 GB', 'Pantalla 6.1", cámara dual y carga rápida.', 299990, 349990, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'TechZone Linares' order by id desc limit 1), 'Audífonos inalámbricos', 'Cancelación de ruido y 30 h de batería.', 49990, null, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'TechZone Linares' order by id desc limit 1), 'Notebook 14" 16 GB RAM', 'SSD 512 GB, ideal para trabajo y estudio.', 549990, null, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'TechZone Linares' order by id desc limit 1), 'Pack Smart', 'Celular + reloj inteligente con descuento.', 339990, 399980, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80&fit=crop&auto=format', true, '1 smartphone 128 GB, 1 smartwatch, 1 cargador rápido');

-- Vivero Las Hojas
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Vivero Las Hojas', 'Natural', '🌿', 'Plantas de interior, suculentas y cactus.', 'Camino Panimávida 1800, Linares', 'Linares', 'Chile', -35.851, -71.5885, '+56 9 7766 5544', '09:00 - 19:00', '09:00 - 17:00', '#DCFCE3', 'plantas, vivero, suculentas, cactus, macetas, jardín', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Vivero Las Hojas' order by id desc limit 1), 'Suculenta en maceta', 'Maceta de cerámica incluida.', 3990, null, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Vivero Las Hojas' order by id desc limit 1), 'Cactus mini', 'Ideal para escritorio, requiere poco riego.', 2990, null, 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Vivero Las Hojas' order by id desc limit 1), 'Pack 3 suculentas', 'Tres suculentas variadas.', 9990, 11970, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&fit=crop&auto=format', true, '3 suculentas, 3 macetas de cerámica, 1 bolsa de sustrato');

-- Moda Andina
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Moda Andina', 'Moda', '👗', 'Ropa casual para hombre y mujer.', 'Valentín Letelier 540, Linares', 'Linares', 'Chile', -35.8445, -71.595, '+56 9 6655 4433', '10:00 - 20:00', '11:00 - 18:00', '#FCE4F1', 'ropa, poleras, jeans, chaquetas, moda, outfit, vestuario', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Moda Andina' order by id desc limit 1), 'Polera algodón básica', '100% algodón, varios colores.', 7990, null, 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Moda Andina' order by id desc limit 1), 'Jeans slim fit', 'Mezclilla con elasticidad.', 24990, 29990, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Moda Andina' order by id desc limit 1), 'Chaqueta de cuero sintético', 'Corte biker, forro interior.', 49990, null, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Moda Andina' order by id desc limit 1), 'Poncho tejido', 'Tejido a mano, talla única.', 19990, null, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Moda Andina' order by id desc limit 1), 'Pack Outfit Casual', 'Un look completo listo para usar.', 39990, 52970, 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800&q=80&fit=crop&auto=format', true, '1 polera, 1 jeans, 1 polerón liviano');

-- Farmacia Vital
insert into public.stores (name, category, emoji, description, address, city, country, lat, lng, phone, schedule_weekday, schedule_weekend, banner_color, keywords, cover_image_url, source, claimed, claimed_at)
values ('Farmacia Vital', 'Salud', '💊', 'Farmacia de barrio con vitaminas y cuidado personal.', 'Maipú 700, Linares', 'Linares', 'Chile', -35.8468, -71.5966, '+56 9 5432 1098', '08:30 - 21:00', '09:00 - 14:00', '#FDE2E2', 'farmacia, vitaminas, medicamentos, cuidado personal, salud', 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80&fit=crop&auto=format', 'admin', true, now());
insert into public.products (store_id, name, description, price, compare_at_price, image_url, is_pack, pack_items) values
  ((select id from public.stores where name = 'Farmacia Vital' order by id desc limit 1), 'Vitamina C 1000 mg (30 comp.)', 'Refuerza tus defensas en invierno.', 5990, 6990, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Farmacia Vital' order by id desc limit 1), 'Multivitamínico (60 caps.)', 'Vitaminas y minerales para el día a día.', 9990, null, 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80&fit=crop&auto=format', false, null),
  ((select id from public.stores where name = 'Farmacia Vital' order by id desc limit 1), 'Aceite esencial de lavanda', '30 ml, con gotario.', 4990, null, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80&fit=crop&auto=format', false, null);

commit;
