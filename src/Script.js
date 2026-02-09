// ====================
// 1. CARGA INICIAL & PRELOADER
// ====================
document.addEventListener('DOMContentLoaded', () => {
  // Preloader Logic
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('opacity-0');
      setTimeout(() => { preloader.style.display = 'none'; }, 500);
    }, 800);
  }

  // Carga Datos
  fetchStockFromSheet();
  updateWishlistCount(); 
  
  // Theme Toggle
  const html = document.documentElement;
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    html.classList.add('dark'); document.getElementById('sun-icon').classList.remove('hidden'); document.getElementById('moon-icon').classList.add('hidden');
  }
  document.getElementById('theme-toggle').addEventListener('click', () => {
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    document.getElementById('sun-icon').classList.toggle('hidden', !isDark);
    document.getElementById('moon-icon').classList.toggle('hidden', isDark);
  });

  // Observers
  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  
  // Render Inicial
  renderProducts(); 
  updateCartCount(); 

  // Listeners Generales
  document.getElementById('category-filters').addEventListener('click', e => { if(e.target.closest('.filter-btn')) filterProducts(e.target.closest('.filter-btn').dataset.category); });
  document.getElementById('products-grid').addEventListener('click', e => { 
    const card = e.target.closest('div.product-card');
    const heartBtn = e.target.closest('button.wishlist-btn-card');
    if (heartBtn) { toggleWishlist(parseInt(heartBtn.dataset.id)); } 
    else if (card) { 
        const btnData = card.querySelector('button[data-id]'); 
        if (btnData) openProductDetail(parseInt(btnData.dataset.id)); 
    }
  });

  document.getElementById('close-detail-modal').addEventListener('click', closeProductDetail);
  
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const isWishlistMode = document.querySelector('.filter-btn.active')?.dataset.category === 'wishlist';
      const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        let matchesCategory = true;
        if (isWishlistMode) matchesCategory = wishlist.includes(product.id);
        else { const currentCategory = document.querySelector('.filter-btn.active').dataset.category; matchesCategory = currentCategory === 'all' || product.category === currentCategory; }
        return matchesSearch && matchesCategory;
      });
      renderProducts(filtered);
      document.getElementById('products-count-label').textContent = `${filtered.length} productos`;
    });
  }

  // Wishlist Nav Button
  document.getElementById('wishlist-toggle-btn').addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-black', 'text-white'));
    const filtered = products.filter(p => wishlist.includes(p.id));
    renderProducts(filtered);
    document.getElementById('products-count-label').textContent = `Tus Favoritos (${filtered.length})`;
  });

  // Quantity & Cart
  document.getElementById('decrease-qty').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); document.getElementById('quantity').value = quantity; });
  document.getElementById('increase-qty').addEventListener('click', () => { const max = parseInt(document.getElementById('quantity').max) || 999; quantity = Math.min(max, quantity + 1); document.getElementById('quantity').value = quantity; });
  document.getElementById('add-to-cart-detail').addEventListener('click', addToCartFromDetail);
  document.getElementById('cart-icon-btn').addEventListener('click', () => { renderCart(); document.getElementById('cart-modal').classList.remove('hidden'); document.getElementById('cart-modal').classList.add('flex'); });
  document.getElementById('close-cart').addEventListener('click', () => { document.getElementById('cart-modal').classList.add('hidden'); document.getElementById('cart-modal').classList.remove('flex'); });
  document.getElementById('continue-shopping').addEventListener('click', () => { document.getElementById('cart-modal').classList.add('hidden'); document.getElementById('cart-modal').classList.remove('flex'); });
  
  document.getElementById('cart-items').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const index = parseInt(btn.dataset.i);
    if (btn.textContent.trim() === 'Eliminar') cart.splice(index, 1);
    else { const delta = parseInt(btn.dataset.d); if (!isNaN(delta)) { cart[index].quantity += delta; if (cart[index].quantity < 1) cart[index].quantity = 1; } }
    saveCartToStorage(); renderCart(); updateCartCount();
  });

  document.getElementById('checkout-whatsapp').addEventListener('click', () => {
    if (cart.length === 0) return alert("Carrito vacío");
    const orderId = Math.floor(1000 + Math.random() * 9000);
    let msg = `¡Hola Infinit! Quiero realizar el *PEDIDO #${orderId}*:\n\n`;
    cart.forEach(i => {
       const finalPrice = i.price || i.product.price;
       msg += `• ${i.quantity}x ${i.product.name}\n   ${i.color.name} | ${i.size} - ${formatPrice(finalPrice)}\n`;
    });
    msg += `\n💰 *TOTAL: ${document.getElementById('cart-total').textContent}*\n\nQuedo a la espera para coordinar el pago y envío.`;
    window.open(`https://wa.me/3816045734?text=${encodeURIComponent(msg)}`, '_blank');
  });

  document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('mobile-menu').classList.toggle('hidden'));
  document.getElementById('toggle-size-guide').addEventListener('click', () => { document.getElementById('size-guide-table').classList.toggle('hidden'); });

  // Eventos Slider Desktop
  document.getElementById('prev-slide').addEventListener('click', prevSlide);
  document.getElementById('next-slide').addEventListener('click', nextSlide);

  // === CORRECCIÓN PARA IPHONE (TOUCH) ===
  const sliderTrack = document.getElementById('slider-track');
  sliderTrack.addEventListener('touchstart', handleTouchStart, { passive: false });
  sliderTrack.addEventListener('touchmove', handleTouchMove, { passive: false });

  // Evento Cerrar Fullscreen
  document.getElementById('close-viewer').addEventListener('click', () => {
      document.getElementById('fullscreen-viewer').classList.add('hidden');
  });
  document.getElementById('fullscreen-viewer').addEventListener('click', (e) => {
      if(e.target.id === 'fullscreen-viewer') document.getElementById('fullscreen-viewer').classList.add('hidden');
  });
});

// ====================
// CONFIGURACIÓN & VARIABLES
// ====================
const observerOptions = { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 }; 

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => { 
    if (entry.isIntersecting) { 
      entry.target.classList.add('is-visible'); 
      observer.unobserve(entry.target); 
    } 
  });
}, observerOptions);

// --- LINK DE GOOGLE SHEETS ---
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOfmo01RWjFhmXqh2k880xj-9DzlAjoJlX1Htq77YEiUP-kzHcAv97h_gxiz4ios9lqbbukvCW0i6L/pub?output=csv";

// --- BASE DE DATOS DE PRODUCTOS ---
const products = [
  { 
    id: 1, 
    name: "Remera Oversize Estampada", 
    price: 17000, 
    category: "remeras", 
    images: ["img/Remera-oversize-veige-frente.jpeg"], 
    colors: [
        { name: "Beige", hex: "#e5e5cb", images: ["img/Remera-oversize-veige-frente.jpeg", "img/Remera-oversize-veige-dorsal.jpeg"] },
        { name: "Negro", hex: "#000", images: ["img/Remera-oversize-negra-frente.jpeg", "img/Remera-oversize-negra-dorsal.jpeg", "img/Remera-oversize-negra-frente-2.jpeg", "img/Remera-oversize-negra-dorsal-2.jpeg"] },
        { name: "Blanco", hex: "#f5f5f5", images: ["img/Remera-oversize-blanca-frente.jpeg", "img/Remera-oversize-blanca-dorsal.jpeg", "img/Remera-oversize-blanca-frente-2.jpeg", "img/Remera-oversize-blanca-dorsal-2.jpeg"], price: 18500 }
    ], 
    sizes: ["S", "M", "L", "XL"], 
    stock: { "Negro-M": 2, "Blanco-L": 2, "Beige-L": 1 } 
  },
  { 
    id: 2, 
    name: "Remera Clásica Lisa", 
    price: 10500, 
    category: "remeras", 
    images: ["img/Remera-clasica-negra.jpeg"], 
    colors: [
        {name:"Negro", hex:"#000", images: ["img/Remera-clasica-negra.jpeg"]}, 
        {name:"Gris", hex:"#808080", images: ["img/Remera-clasica-gris.jpeg"]},
        {name:"Blanco", hex:"#fff", images: ["img/Remera-clasica-blanca.jpeg"]}
    ], 
    sizes: ["S", "M", "L", "XL"], 
    stock: { "Negro-L": 1, "Blanco-M": 1, "Gris-L": 1 } 
  },
  { 
    id: 3, 
    name: "Remera Oversize Lisa", 
    price: 17000, 
    category: "remeras", 
    images: ["img/oversize.lisa.negra.jpeg"], 
    colors: [
        {name:"Negro", hex:"#000", images: ["img/oversize.lisa.negra.jpeg"]}, 
        {name:"Gris Oscuro", hex:"#333", images: ["img/oversize.lisa.negra-gris.jpeg"]},
        {name:"Gris", hex:"#808080", images: ["img/oversize.lisa.gris.jpeg"]},
        {name:"Blanco", hex:"#fff", images: ["img/oversize.lisa.blanca.jpeg"]}
    ], 
    sizes: ["S", "M", "L", "XL"], 
    stock: { 
        "Negro-M": 1, "Negro-XL": 1,
        "Blanco-M": 1, "Blanco-L": 1, "Blanco-XL": 1,
        "Gris Oscuro-L": 1,
        "Gris-M": 1, "Gris-L": 1
    } 
  },
  { 
    id: 4, 
    name: "Jean Mom", 
    price: 35200, 
    category: "jeans", 
    images: ["img/largo-mom-gris.jpeg"], 
    colors: [
        {name:"Gris", hex:"#808080", images: ["img/largo-mom-gris.jpeg"]}, 
        {name:"Celeste", hex:"#93c5fd", images: ["img/largo-mom-celeste.jpeg"]}
    ], 
    sizes: ["38", "40", "42", "44", "46"], 
    stock: { "Celeste-42": 1, "Gris-44": 1 } 
  },
  { 
    id: 5, 
    name: "Jean Baggy", 
    price: 38400, 
    category: "jeans", 
    images: ["img/largo-baggy-natural.jpeg"], 
    colors: [
        { name: "Natural", hex: "#f5f5dc", images: ["img/largo-baggy-natural.jpeg", "img/largo-baggy-natural-atras.jpeg"] },
        { name: "Gris Oscuro", hex: "#333", images: ["img/largo-baggy-negro.jpeg"] },
        { name: "Chocolate", hex: "#3e2723", images: ["img/largo-baggy-chocolate.jpeg"] },
        { name: "Celeste Oxidado", hex: "#93c5fd", images: ["img/largo-baggy-celeste-oxidado.jpeg"] },
        { name: "Camuflado", hex: "#556b2f", images: ["img/largo-baggy-camuflado.jpeg"] } 
    ], 
    sizes: ["38", "40", "42", "44", "46"], 
    stock: { 
        "Natural-46": 1, 
        "Gris Oscuro-44": 1, 
        "Celeste Oxidado-42": 1, 
        "Chocolate-40": 1, 
        "Camuflado-42": 1 
    } 
  },
  { 
    id: 6, 
    name: "Chomba Clásica", 
    price: 16300, 
    category: "remeras", 
    images: ["img/chomba-negra.jpeg"], 
    colors: [
        {name:"Verde", hex:"#15803d", images: ["img/chomba-verde.jpeg"]}, 
        {name:"Negro", hex:"#000", images: ["img/chomba-negra.jpeg"]},
        {name:"Blanco", hex:"#fff", images: ["img/chomba-blanca.jpeg"]}
    ], 
    sizes: ["S", "M", "L", "XL"], 
    stock: { "Negro-L": 1, "Verde-XL": 1, "Blanco-M": 1 } 
  },
  { 
    id: 7, 
    name: "Camisa Larga", 
    price: 32000, 
    category: "remeras", 
    images: ["img/Camisa-larga-negra.jpeg"], 
    colors: [
        {name:"Negro", hex:"#000", images: ["img/Camisa-larga-negra.jpeg"]}, 
        {name:"Blanco", hex:"#fff", images: ["img/camisa-larga-blanca.jpeg"]}
    ], 
    sizes: ["S", "M", "L", "XL"], 
    stock: { "Blanco-XL": 1, "Blanco-M": 1, "Negro-L": 1 } 
  },
  { 
    id: 8, 
    name: "Bermuda Mom", 
    price: 34000, 
    category: "bermudas", 
    images: ["img/bermuda-mom-natural.jpeg"], 
    colors: [
        { name: "Natural", hex: "#f5f5dc", images: ["img/bermuda-mom-natural.jpeg", "img/bermuda-mom-natural-atras.jpeg"] },
        { name: "Celeste", hex: "#93c5fd", images: ["img/bermuda-mom-celeste.jpeg", "img/bermuda-mom-celeste-atras.jpeg"] }
    ], 
    sizes: ["38", "40", "42", "44", "46"], 
    stock: { "Celeste-40": 1, "Natural-46": 1 } 
  },
  { 
    id: 9, 
    name: "Bermuda Baggy", 
    price: 35500, 
    category: "bermudas", 
    images: ["img/bermuda-baggy-negra.jpeg"], 
    colors: [
        { name: "Negro", hex: "#000", images: ["img/bermuda-baggy-negra.jpeg", "img/bermuda-baggy-negra-atras.jpeg"] },
        { name: "Gris", hex: "#808080", images: ["img/bermuda-baggy-gris.jpeg", "img/bermuda-baggy-gris-atras.jpeg"] },
        { name: "Celeste", hex: "#93c5fd", images: ["img/bermuda-baggy-celeste.jpeg", "img/bermuda-baggy-celeste-atras.jpeg"] }
    ], 
    sizes: ["38", "40", "42", "44", "46"], 
    stock: { "Celeste-38": 1, "Gris-44": 1, "Negro-42": 1 } 
  }
];

let cart = JSON.parse(localStorage.getItem('infinit-cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('infinit-wishlist')) || [];
let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let quantity = 1;

let currentSlideIndex = 0;
let currentProductImages = [];
let xDown = null;
let yDown = null;

// ====================
// LOGICA WISHLIST
// ====================
function toggleWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index === -1) { wishlist.push(productId); showToastMsg("❤️ Agregado a Favoritos"); } 
  else { wishlist.splice(index, 1); showToastMsg("💔 Eliminado de Favoritos"); }
  localStorage.setItem('infinit-wishlist', JSON.stringify(wishlist));
  
  const wishIcon = document.getElementById('wishlist-toggle-btn');
  wishIcon.classList.add('pop-anim'); setTimeout(() => wishIcon.classList.remove('pop-anim'), 300);
  
  updateWishlistCount();
  const currentCategory = document.querySelector('.filter-btn.active')?.dataset.category;
  if (currentCategory === 'wishlist') { const filtered = products.filter(p => wishlist.includes(p.id)); renderProducts(filtered); document.getElementById('products-count-label').textContent = `Tus Favoritos (${filtered.length})`; }
  else {
     const btn = document.querySelector(`button.wishlist-btn-card[data-id="${productId}"]`);
     if(btn) {
       const isFav = wishlist.includes(productId);
       btn.innerHTML = isFav ? `<svg class="w-5 h-5 text-red-500 heart-anim" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` : `<svg class="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
     }
  }
}
function updateWishlistCount() { const b = document.getElementById('wishlist-count'); if(b) wishlist.length > 0 ? b.classList.remove('hidden') : b.classList.add('hidden'); }

// ====================
// HELPERS
// ====================
function formatPrice(price) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price); }
function getStockForVariant(product, colorName, size) { if (!product || !product.stock) return 0; return product.stock[`${colorName}-${size}`] ?? 0; }
function saveCartToStorage() { localStorage.setItem('infinit-cart', JSON.stringify(cart)); }
function showToastMsg(msg) { const t = document.getElementById('toast'); t.querySelector('.font-medium').textContent = msg; t.querySelector('.text-sm').textContent = ""; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2000); }

// --- FUNCION NUEVA: OBTENER DATOS (STOCK Y PRECIO) DEL SHEET ---
async function fetchStockFromSheet() {
  if (!SHEET_URL) {
      renderProducts(); // Si no hay sheet, renderiza lo local y chau
      return;
  }
  try { 
      const r = await fetch(SHEET_URL); 
      const t = await r.text(); 
      const rows = t.split('\n').slice(1); // Ignorar cabecera
      
      const stockData = {}; // Objeto temporal para el stock

      rows.forEach(row => { 
          const c = row.split(','); 
          if(c.length >= 3) { 
              const id = parseInt(c[0].trim());
              const variant = c[1].trim(); // Ej: Negro-S
              const qty = parseInt(c[2].trim());
              
              // 1. Guardar Stock
              if(!stockData[id]) stockData[id] = {}; 
              stockData[id][variant] = qty; 

              // 2. Guardar Precio (Si existe la columna D y es un número válido)
              if(c.length >= 4) {
                  const newPrice = parseInt(c[3].trim());
                  if(!isNaN(newPrice)) {
                      // Buscamos el producto en nuestra base local y le actualizamos el precio
                      const product = products.find(p => p.id === id);
                      if(product) {
                          product.price = newPrice;
                      }
                  }
              }
          }
      }); 

      // Asignar el stock procesado a los productos
      products.forEach(p => { 
          if(stockData[p.id]) p.stock = stockData[p.id]; 
      }); 

      // IMPORTANTE: Volver a renderizar para que se vean los precios nuevos
      renderProducts();

  } catch (error) { 
      console.error("Error cargando Sheet:", error); 
      renderProducts(); // Si falla, mostramos lo local
  }
}

function updateStockDisplay() {
  const stockInfo = document.getElementById('stock-info'); const addButton = document.getElementById('add-to-cart-detail'); const qtyInput = document.getElementById('quantity'); if (!stockInfo) return;
  const available = getStockForVariant(currentProduct, selectedColor.name, selectedSize);
  if (available === 0) { stockInfo.innerHTML = `<div class="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg w-fit"><span class="font-bold">❌ Agotado</span></div>`; addButton.disabled = true; addButton.classList.add('opacity-50', 'cursor-not-allowed'); addButton.textContent = "SIN STOCK"; qtyInput.max = 0; qtyInput.value = 0; } 
  else if (available <= 3) { stockInfo.innerHTML = `<div class="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg w-fit animate-pulse">🔥 <span class="font-bold">¡Quedan ${available}!</span></div>`; addButton.disabled = false; addButton.classList.remove('opacity-50', 'cursor-not-allowed'); addButton.textContent = "AGREGAR AL CARRITO"; qtyInput.max = available; if (qtyInput.value == 0) qtyInput.value = 1; } 
  else { stockInfo.innerHTML = `<div class="flex items-center gap-2 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-2 rounded-lg w-fit">✅ <span class="font-medium">Disponible</span></div>`; addButton.disabled = false; addButton.classList.remove('opacity-50', 'cursor-not-allowed'); addButton.textContent = "AGREGAR AL CARRITO"; qtyInput.max = available; if (qtyInput.value == 0) qtyInput.value = 1; }
}

// ====================
// RENDERIZADO
// ====================
function renderProducts(productsToRender = products) {
  const container = document.getElementById('products-grid'); if (!container) return; container.innerHTML = '';
  if (productsToRender.length === 0) return container.innerHTML = `<div class="col-span-full text-center py-10 text-zinc-500">No hay productos.</div>`;
  productsToRender.forEach(product => {
    const isFav = wishlist.includes(product.id);
    const card = document.createElement('div'); card.className = 'product-card group cursor-pointer bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 reveal-on-scroll relative';
    
    // Calcular precio para mostrar (el menor posible o el base)
    // Mostramos el precio base en la tarjeta principal
    const displayPrice = product.price;

    card.innerHTML = `
      <div class="relative overflow-hidden rounded-xl sm:rounded-2xl aspect-[4/5] bg-zinc-100 dark:bg-zinc-800">
        <img src="${product.images[0]}" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" alt="${product.name}">
        <img src="${(product.colors[0] && product.colors[0].images && product.colors[0].images[1]) || product.images[0]}" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0 group-hover:opacity-100" alt="Back">
        <div class="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/90 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow text-zinc-900 z-10">Nuevo</div>
        <button data-id="${product.id}" class="wishlist-btn-card absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-sm z-20 transition-transform hover:scale-110">
           ${isFav ? `<svg class="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` : `<svg class="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`}
        </button>
      </div>
      <div class="mt-3 px-1">
        <div class="font-medium text-sm sm:text-lg tracking-tight text-zinc-900 dark:text-white leading-tight truncate">${product.name}</div>
        <div class="flex justify-between items-end mt-2">
          <div><div class="text-zinc-400 text-[10px] sm:text-sm">Precio</div><div class="text-base sm:text-xl font-semibold logo-font text-zinc-900 dark:text-white">${formatPrice(displayPrice)}</div></div>
          <button data-id="${product.id}" class="btn-add bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm shadow-lg shadow-teal-500/30 hover:shadow-teal-400/60 hover:shadow-xl transition-all duration-300">Ver detalles</button>
        </div>
      </div>`;
    container.appendChild(card); observer.observe(card);
  });
}

function filterProducts(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => { if(btn.dataset.category === category) { btn.classList.add('active'); btn.classList.remove('text-zinc-600'); } else { btn.classList.remove('active'); btn.classList.add('text-zinc-600'); } });
  if (category === 'all') { renderProducts(products); document.getElementById('products-count-label').textContent = `${products.length} productos`; }
  else { const filtered = products.filter(p => p.category === category); renderProducts(filtered); document.getElementById('products-count-label').textContent = `${filtered.length} productos`; }
}

// ====================
// PRODUCT DETAIL & SLIDER LOGIC
// ====================
function openProductDetail(productId) {
  currentProduct = products.find(p => p.id === productId);
  if (!currentProduct) return;
  document.body.classList.add('overflow-hidden');
  
  selectedColor = currentProduct.colors[0];
  currentProductImages = selectedColor.images || currentProduct.images; 
  selectedSize = currentProduct.sizes.find(s => getStockForVariant(currentProduct, selectedColor.name, s) > 0) || currentProduct.sizes[0];
  quantity = 1;
  
  document.getElementById('modal-product-name').textContent = currentProduct.name;
  
  // LOGICA PRECIO DINAMICO (Si el color tiene precio, usa ese, sino el del producto)
  const dynamicPrice = selectedColor.price || currentProduct.price;
  document.getElementById('modal-product-price').textContent = formatPrice(dynamicPrice);
  
  currentSlideIndex = 0;
  renderSlider();
  document.getElementById('size-guide-table').classList.add('hidden');
  document.getElementById('toggle-size-guide').innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg> Ver Guía de Talles`;
  
  const colorsContainer = document.getElementById('color-options');
  colorsContainer.innerHTML = '';
  currentProduct.colors.forEach(color => {
    const div = document.createElement('div');
    div.className = `color-circle cursor-pointer relative`; 
    div.style.backgroundColor = color.hex;
    if (color.hex === '#000' || color.hex === '#000000') div.style.border = '1px solid #333';
    div.onclick = () => {
      colorsContainer.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
      div.classList.add('selected');
      selectedColor = color;
      currentProductImages = selectedColor.images || currentProduct.images;
      
      // ACTUALIZAR PRECIO AL CAMBIAR COLOR
      const newPrice = selectedColor.price || currentProduct.price;
      document.getElementById('modal-product-price').textContent = formatPrice(newPrice);

      currentSlideIndex = 0; renderSlider(); 
      renderSizeButtons(); updateStockDisplay();
      quantity = 1; document.getElementById('quantity').value = 1;
    };
    if (color === selectedColor) div.classList.add('selected');
    colorsContainer.appendChild(div);
  });
  renderSizeButtons(); 
  document.getElementById('quantity').value = quantity;
  document.getElementById('product-detail-modal').classList.remove('hidden');
  document.getElementById('product-detail-modal').classList.add('flex');
  updateStockDisplay();
}

function renderSizeButtons() {
    const sizesContainer = document.getElementById('size-options');
    sizesContainer.innerHTML = '';
    currentProduct.sizes.forEach(size => {
      const stock = getStockForVariant(currentProduct, selectedColor.name, size);
      const btn = document.createElement('button');
      let classes = "size-btn font-medium transition-all relative flex items-center justify-center "; 
      if (stock === 0) classes += "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 decoration-zinc-500 line-through";
      else classes += "hover:border-black dark:hover:border-white";
      if (size === selectedSize) classes += " selected bg-black text-white border-black dark:bg-white dark:text-black";
      btn.className = classes;
      btn.textContent = size;
      btn.onclick = () => {
        sizesContainer.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'bg-black', 'text-white', 'border-black', 'dark:bg-white', 'dark:text-black'));
        btn.classList.add('selected', 'bg-black', 'text-white', 'border-black', 'dark:bg-white', 'dark:text-black');
        selectedSize = size; updateStockDisplay();
      };
      sizesContainer.appendChild(btn);
    });
}

function closeProductDetail() {
  document.body.classList.remove('overflow-hidden');
  document.getElementById('product-detail-modal').classList.add('hidden');
  document.getElementById('product-detail-modal').classList.remove('flex');
}

function addToCartFromDetail() {
  if (!currentProduct) return;
  const available = getStockForVariant(currentProduct, selectedColor.name, selectedSize);
  if (available < quantity) { alert(`Solo hay ${available} disponibles`); return; }
  
  // GUARDAMOS EL PRECIO QUE SE VEIA EN PANTALLA (POR SI ERA COLOR PREMIUM)
  const finalPrice = selectedColor.price || currentProduct.price;

  const existing = cart.find(i => i.product.id === currentProduct.id && i.color.name === selectedColor.name && i.size === selectedSize);
  if (existing) existing.quantity += quantity;
  else cart.push({ 
      product: { ...currentProduct, images: currentProductImages }, 
      color: selectedColor, 
      size: selectedSize, 
      quantity: quantity,
      price: finalPrice // Guardamos el precio real
  });
  
  saveCartToStorage(); updateCartCount(); showToastMsg("¡Agregado al carrito!"); 
  const cartIcon = document.getElementById('cart-icon-btn'); cartIcon.classList.add('pop-anim'); setTimeout(() => cartIcon.classList.remove('pop-anim'), 300);
  closeProductDetail();
}

function updateCartCount() { document.getElementById('cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0); }
function renderCart() {
  const container = document.getElementById('cart-items'); container.innerHTML = '';
  if (cart.length === 0) { container.innerHTML = `<div class="py-10 text-center"><div class="text-4xl mb-2">🛒</div><p class="text-zinc-500">Carrito vacío</p></div>`; document.getElementById('cart-total').textContent = formatPrice(0); return; }
  let total = 0;
  cart.forEach((item, index) => {
    // Usar el precio guardado en el item, o el del producto si no existe
    const itemPrice = item.price || item.product.price;
    total += itemPrice * item.quantity;
    const div = document.createElement('div');
    const imgUrl = item.product.images ? item.product.images[0] : item.product.image; 
    div.innerHTML = `
      <div class="flex gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0">
        <img src="${imgUrl}" class="w-16 h-16 object-cover rounded-lg">
        <div class="flex-1">
          <div class="font-medium text-zinc-900 dark:text-white">${item.product.name}</div>
          <div class="text-xs text-zinc-500">${item.color.name} - ${item.size}</div>
          <div class="text-teal-600 font-semibold mt-1">${formatPrice(itemPrice)}</div>
          <div class="flex justify-between items-center mt-2">
            <div class="flex border rounded text-sm"><button data-i="${index}" data-d="-1" class="px-2">-</button><span class="px-2">${item.quantity}</span><button data-i="${index}" data-d="1" class="px-2">+</button></div>
            <button data-i="${index}" class="text-red-500 text-xs hover:underline">Eliminar</button>
          </div>
        </div>
      </div>`;
    container.appendChild(div);
  });
  document.getElementById('cart-total').textContent = formatPrice(total);
  document.getElementById('cart-items-count').innerText = `${cart.length} items`;
}

function renderSlider() {
  const track = document.getElementById('slider-track');
  const dotsContainer = document.getElementById('slider-dots');
  track.innerHTML = ''; dotsContainer.innerHTML = '';
  currentProductImages.forEach((img) => {
    const slide = document.createElement('div');
    slide.className = 'w-full h-full flex-shrink-0 flex items-center justify-center bg-white dark:bg-black'; 
    const imgEl = document.createElement('img');
    imgEl.src = img;
    imgEl.className = "w-full h-full object-contain cursor-pointer";
    imgEl.addEventListener('click', () => { document.getElementById('fullscreen-image').src = img; document.getElementById('fullscreen-viewer').classList.remove('hidden'); });
    slide.appendChild(imgEl);
    track.appendChild(slide);
    const dot = document.createElement('div');
    dot.className = 'w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 transition-colors';
    dotsContainer.appendChild(dot);
  });
  updateSlider();
}

function updateSlider() {
  const track = document.getElementById('slider-track');
  const dots = document.getElementById('slider-dots').children;
  track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
  Array.from(dots).forEach((dot, index) => {
    if (index === currentSlideIndex) { dot.classList.remove('bg-zinc-300', 'dark:bg-zinc-600'); dot.classList.add('bg-black', 'dark:bg-white', 'scale-125'); } 
    else { dot.classList.add('bg-zinc-300', 'dark:bg-zinc-600'); dot.classList.remove('bg-black', 'dark:bg-white', 'scale-125'); }
  });
}

function nextSlide() { if (currentSlideIndex < currentProductImages.length - 1) { currentSlideIndex++; updateSlider(); } }
function prevSlide() { if (currentSlideIndex > 0) { currentSlideIndex--; updateSlider(); } }

function handleTouchStart(evt) { xDown = evt.touches[0].clientX; yDown = evt.touches[0].clientY; }

// === FUNCIÓN TOUCHMOVE REFORZADA PARA IPHONE ===
function handleTouchMove(evt) {
  if (!xDown || !yDown) { return; }

  let xUp = evt.touches[0].clientX;
  let yUp = evt.touches[0].clientY;

  let xDiff = xDown - xUp;
  let yDiff = yDown - yUp;

  // Si el movimiento horizontal es mayor que el vertical (el usuario quiere deslizar)
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
      // 1. IMPORTANTE: Bloqueamos el scroll nativo inmediatamente
      if (evt.cancelable) {
         evt.preventDefault();
         evt.stopPropagation(); // Frenamos cualquier otra acción del navegador
      }
      
      // 2. Detectamos el deslizamiento con un umbral bajo (10px) para que responda rápido
      if (Math.abs(xDiff) > 10) { 
          if (xDiff > 0) nextSlide(); else prevSlide();
          
          // 3. Reseteamos las variables inmediatamente para permitir el siguiente deslizamiento rápido
          xDown = null; 
          yDown = null; 
      }
  } 
  // Si es vertical, no hacemos nada y dejamos que la página scrollee (gracias al CSS pan-y)
}

// === OPTIMIZACIÓN 60 FPS: SCROLL HANDLER CON REQUESTANIMATIONFRAME ===
let isScrolling = false;

function onScroll() {
  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) { 
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop; 
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight; 
    progressBar.style.width = `${(scrollTop / scrollHeight) * 100}%`; 
  }
  
  const nav = document.getElementById('main-nav');
  if(nav) { 
    if (window.scrollY > 10) { 
      nav.classList.add('bg-white/90', 'dark:bg-black/90', 'backdrop-blur-md', 'border-zinc-100', 'dark:border-zinc-800'); 
      nav.classList.remove('bg-transparent', 'border-transparent'); 
    } else { 
      nav.classList.add('bg-transparent', 'border-transparent'); 
      nav.classList.remove('bg-white/90', 'dark:bg-black/90', 'backdrop-blur-md', 'border-zinc-100', 'dark:border-zinc-800'); 
    } 
  }
  isScrolling = false;
}

window.addEventListener('scroll', () => {
  if (!isScrolling) {
    window.requestAnimationFrame(onScroll);
    isScrolling = true;
  }
}, { passive: true });