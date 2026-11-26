const PINOYCART_API_BASE = 'https://pinoycart-website1-backend.onrender.com';
const DEFAULT_PRODUCTS = [
  ["Wireless Bluetooth Earbuds","Electronics",599,899,"photo-1590658268037-6bf12165a8df"],
  ["Smart Watch","Electronics",899,1299,"photo-1523275335684-37898b6baf30"],
  ["Wireless Headphones","Electronics",749,1099,"photo-1505740420928-5e560c06d30e"],
  ["Portable Speaker","Electronics",499,799,"photo-1608043152269-423dbba4e7e1"],
  ["Power Bank 20000mAh","Electronics",599,999,"photo-1609592806596-b43bada2f8d1"],
  ["Men's Casual Shirt","Fashion",299,499,"photo-1598033129183-c4f50c736f10"],
  ["Women's Summer Dress","Fashion",399,699,"photo-1595777457583-95e059d581b8"],
  ["Unisex Polo Shirt","Fashion",349,599,"photo-1627225924765-552d49cf47ad"],
  ["Men's Sneakers","Fashion",799,1199,"photo-1542291026-7eec264c27ff"],
  ["Women's Handbag","Fashion",499,899,"photo-1584917865442-de89df76afd3"],
  ["Travel Backpack","Fashion",449,799,"photo-1553062407-98eeb64c6a62"],
  ["Sunglasses","Accessories",199,399,"photo-1511499767150-a48a237f0083"],
  ["Fashion Watch","Accessories",399,699,"photo-1524805444758-089113d48a6d"],
  ["Baseball Cap","Accessories",149,299,"photo-1588850561407-ed78c282e89b"],
  ["Wallet","Accessories",249,449,"photo-1627123424574-724758594e93"],
  ["Phone Case","Accessories",99,199,"photo-1603313011101-320f26a4f6f6"],
  ["Kitchen Organizer","Home",249,399,"photo-1556911220-e15b29be8c8f"],
  ["Water Bottle","Home",149,299,"photo-1602143407151-7111542de6e8"],
  ["Table Lamp","Home",399,699,"photo-1507473885765-e6ed057f782c"],
  ["Bedsheet Set","Home",599,999,"photo-1631049307264-da0ec9d70304"],
  ["Coffee Mug","Home",99,199,"photo-1514228742587-6b1558fcca3d"],
  ["Storage Box","Home",199,349,"photo-1591129841117-3adfd313e34f"],
  ["Facial Cleanser","Beauty",199,349,"photo-1556229010-6c3f2c9ca5f8"],
  ["Skin Care Set","Beauty",499,899,"photo-1608248543803-ba4f8c70ae0b"],
  ["Perfume","Beauty",349,599,"photo-1541643600914-78b084683601"],
  ["Makeup Kit","Beauty",399,699,"photo-1596462502278-27bfdc403348"],
  ["Hair Dryer","Beauty",599,999,"photo-1522338242992-e1a54906a8da"],
  ["Phone Stand","Accessories",129,249,"photo-1586953208448-b95a79798f07"],
  ["Mini Fan","Electronics",249,449,"photo-1576086213369-97a306d36557"],
  ["LED Desk Light","Home",299,499,"photo-1507473885765-e6ed057f782c"],
  ["Pancake POS Integration Test Item","Integration Test",499,499,"photo-1505740420928-5e560c06d30e"]
];
const DEFAULT_FASHION_STOCK = {M:10,L:10,XL:10,"2XL":10,"3XL":10};
function migrateFashionStock(catalog) {
  return catalog.map(product => {
    if (product && product[1] === "Fashion") {
      const old = product[5] || DEFAULT_FASHION_STOCK;
      if (!old.colors || !old.stock) product[5] = {colors:["Black"],stock:{Black:{...old}}};
    }
    return product;
  });
}

let products = loadProductCatalog();
const PANCAKE_DYNAMIC_PRODUCTS = new Set();
async function loadPancakeStorefrontProducts() {
  try {
    const response = await fetch(`${PINOYCART_API_BASE}/api/products/pancake`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.products)) throw new Error('Catalog fetch failed');
    // Remove previously appended live Pancake products, then append the latest catalog.
    for (const id of PANCAKE_DYNAMIC_PRODUCTS) delete products[id];
    PANCAKE_DYNAMIC_PRODUCTS.clear();
    result.products.forEach((item) => {
      let id = 31;
      while (products[id]) id++;
      const imageRef = item.image && (String(item.image).startsWith('http') || String(item.image).startsWith('data:image'))
        ? String(item.image) : 'photo-1505740420928-5e560c06d30e';
      products[id] = [item.name, 'Pancake POS', Number(item.price), Number(item.price), imageRef, null, null, null, null, null, null, 0, 0, 0, String(item.product_id), String(item.variation_id), String(item.sku || ''), Number(item.stock || 0)];
      PANCAKE_DYNAMIC_PRODUCTS.add(id);
    });
    renderProducts();
    updateCart();
    initializeProductDetailsPage();
  } catch (error) {
    console.warn('Live Pancake catalog is unavailable; showing the saved PinoyCart catalog.', error);
    initializeProductDetailsPage();
  }
}

function loadProductCatalog() {
  try {
    const saved = localStorage.getItem("pinoycart_products");
    const catalog = saved ? JSON.parse(saved) : DEFAULT_PRODUCTS.slice();
    // Keep the integration-test item at its mapped index (30) when an older
    // saved catalog contains only the original 30 products.
    if (saved && Array.isArray(catalog) && catalog.length <= 30 && DEFAULT_PRODUCTS[30]) {
      catalog[30] = DEFAULT_PRODUCTS[30].slice();
    }
    return migrateFashionStock(catalog);
  } catch { return migrateFashionStock(DEFAULT_PRODUCTS.slice()); }
}
function saveProductCatalog() {
  localStorage.setItem("pinoycart_products", JSON.stringify(products));
}

// Keep the storefront in sync when the admin page changes products in another tab.
window.addEventListener("storage", event => {
  if (event.key !== "pinoycart_products") return;
  try {
    products = migrateFashionStock(event.newValue ? JSON.parse(event.newValue) : DEFAULT_PRODUCTS.slice());
    cart = cart.filter(item => products[item.id]);
    saveCart();
    renderProducts();
  } catch (error) {
    console.error("Could not sync the PinoyCart product catalog:", error);
  }
});

function refreshProductCatalogFromStorage() {
  try {
    const saved = localStorage.getItem("pinoycart_products");
    if (saved) {
      products = migrateFashionStock(JSON.parse(saved));
      cart = cart.filter(item => products[item.id]);
      saveCart();
      renderProducts();
    }
  } catch (error) {
    console.error("Could not reload the PinoyCart product catalog:", error);
  }
}
// When returning to the storefront, refresh the live Pancake catalog instead of
// replacing it with the saved local catalog (which does not contain POS products).
let pancakeRefreshPending = false;
function refreshPancakeCatalogOnReturn() {
  if (pancakeRefreshPending || document.hidden) return;
  pancakeRefreshPending = true;
  loadPancakeStorefrontProducts().finally(() => {
    pancakeRefreshPending = false;
  });
}
window.addEventListener("pageshow", refreshPancakeCatalogOnReturn);
window.addEventListener("focus", refreshPancakeCatalogOnReturn);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshPancakeCatalogOnReturn();
});
function productImage(p) {
  const image = p && p[4] ? String(p[4]) : "";
  return image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image/")
    ? image : `https://images.unsplash.com/${image}?auto=format&fit=crop&w=500&q=80`;
}


const money = n => "₱" + n.toLocaleString("en-PH");
let cart = JSON.parse(localStorage.getItem("pinoycart_cart") || "[]");
cart = cart.filter(item => products[item.id]);
let selectedCategory = "All";

// Sample/demo sold labels, randomly assigned once per product for this page session.
const SOLD_LABEL_CHOICES = ["12k sold", "5k sold", "1k sold", "3k sold", "7k sold", "2k sold"];
const productSoldLabels = new Map();
function getSoldLabel(productId) {
  if (!productSoldLabels.has(productId)) {
    const choice = SOLD_LABEL_CHOICES[Math.floor(Math.random() * SOLD_LABEL_CHOICES.length)];
    productSoldLabels.set(productId, choice);
  }
  return productSoldLabels.get(productId);
}

function saveCart() {
  localStorage.setItem("pinoycart_cart", JSON.stringify(cart));
}


const FASHION_SIZES = ["M", "L", "XL", "2XL", "3XL"];
function fashionColors(product) {
  return product && product[5] && Array.isArray(product[5].colors) ? product[5].colors : ["Black"];
}
function fashionNeedsSize(product) { return product && product[1] === "Fashion" && (!product[8] || product[8] === "T-Shirt"); }
function hasColorVariants(product) { return !!(product && (product[1] === "Fashion" || (product[5] && Array.isArray(product[5].colors) && product[5].colors.length))); }
function fashionStock(product, color, size = "") {
  const entry = product && product[5] && product[5].stock && product[5].stock[color];
  if (fashionNeedsSize(product)) return Number(entry && entry[size] || 0);
  return Number(typeof entry === "number" ? entry : entry && entry.__stock || 0);
}
function productDescription(p) {
  // Prefer the description entered by Admin; retain fallback copy for older demo products.
  if (p && typeof p[7] === "string" && p[7].trim()) return p[7].trim();
  const descriptions = {
    Electronics: `${p[0]} is a handy everyday electronic accessory designed for convenient use at home, at work, or while travelling. Check the product photos and specifications before ordering.`,
    Fashion: `${p[0]} is a versatile fashion pick for everyday wear. Its practical style makes it easy to pair with your favorite outfits. Please check the photos and choose carefully before ordering.`,
    Home: `${p[0]} is a useful home and living item designed to help make your daily routine more convenient. Review the product photos and dimensions before placing an order.`,
    Beauty: `${p[0]} is a beauty and personal-care item for your everyday routine. Please read the packaging and ingredient information provided by the seller before use.`,
    Accessories: `${p[0]} is a practical accessory that complements your everyday essentials. Check the product photos, size, and compatibility details before ordering.`
  };
  return descriptions[p[1]] || `${p[0]} is a featured PinoyCart product. See the product photos and details before ordering.`;
}

let activeDetailColorIndex = 0;
function setDetailGalleryColor(index, colors, product) {
  if (!colors.length) return;
  activeDetailColorIndex = (index + colors.length) % colors.length;
  const color = colors[activeDetailColorIndex];
  const image = (product[6] && product[6][color]) || product[4];
  const detailImage = document.getElementById("detailImage");
  detailImage.style.opacity = "0.35";
  detailImage.src = image && /^(https?:\/\/|data:image\/)/i.test(image) ? image : `https://images.unsplash.com/${image}?auto=format&fit=crop&w=700&q=85`;
  detailImage.alt = `${product[0]} - ${color}`;
  detailImage.onload = () => { detailImage.style.opacity = "1"; };
  document.getElementById("galleryColorLabel").textContent = color;
  document.getElementById("galleryColorLabel").hidden = false;
  const gallery = document.getElementById("detailGallery");
  gallery._activeSlide = activeDetailColorIndex;
  document.getElementById("galleryDots").querySelectorAll("button").forEach((dot,i)=>dot.classList.toggle("active",i===activeDetailColorIndex));
  const colorSelect = document.getElementById("detailColor");
  if (colorSelect && colorSelect.value !== color) {
    colorSelect.value = color;
    colorSelect.dispatchEvent(new Event("change"));
  }
}
function setupDetailGallery(colors, product) {
  const dots = document.getElementById("galleryDots");
  const label = document.getElementById("galleryColorLabel");
  const hint = document.getElementById("gallerySwipeHint");
  const gallery = document.getElementById("detailGallery");
  const extras = !fashionNeedsSize(product) && Array.isArray(product[10]) ? product[10] : [];
  dots.innerHTML = "";
  if (!colors.length) { label.hidden = true; hint.hidden = true; return; }
  const showExtra = index => {
    const src = extras[index];
    if (!src) return;
    gallery._activeSlide = colors.length + index;
    const image = document.getElementById("detailImage");
    image.style.opacity = "0.35";
    image.src = /^(https?:\/\/|data:image\/)/i.test(src) ? src : `https://images.unsplash.com/${src}?auto=format&fit=crop&w=700&q=85`;
    image.alt = `${product[0]} photo ${index+2}`;
    image.onload = () => { image.style.opacity = "1"; };
    label.hidden = true;
    dots.querySelectorAll("button").forEach((dot,i)=>dot.classList.toggle("active",i===gallery._activeSlide));
  };
  colors.forEach((color,index) => {
    const dot = document.createElement("button");
    dot.type = "button"; dot.setAttribute("aria-label", `View ${color} color`);
    dot.addEventListener("click",()=>setDetailGalleryColor(index,colors,product));
    dots.appendChild(dot);
  });
  extras.forEach((_,index)=>{
    const dot=document.createElement("button"); dot.type="button";
    dot.setAttribute("aria-label",`View additional product photo ${index+1}`);
    dot.addEventListener("click",()=>showExtra(index)); dots.appendChild(dot);
  });
  label.hidden = false;
  hint.hidden = colors.length + extras.length < 2;
  if (!gallery.dataset.swipeReady) {
    let startX = 0, startY = 0;
    gallery.addEventListener("touchstart",event=>{const touch=event.changedTouches[0];startX=touch.clientX;startY=touch.clientY;},{passive:true});
    gallery.addEventListener("touchend",event=>{
      const touch=event.changedTouches[0], dx=touch.clientX-startX, dy=touch.clientY-startY;
      if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2 && typeof gallery._swipeGallery === "function") gallery._swipeGallery(dx<0?1:-1);
    },{passive:true});
    gallery.dataset.swipeReady = "1";
  }
  gallery._colors = colors;
  gallery._product = product;
  gallery._activeSlide = 0;
  gallery._swipeGallery = direction => {
    const total = colors.length + extras.length;
    const next = (gallery._activeSlide + direction + total) % total;
    if (next < colors.length) setDetailGalleryColor(next,colors,product);
    else showExtra(next - colors.length);
  };
  setDetailGalleryColor(0,colors,product);
}

function setupExtraProductGallery(product) {
  const images = [product[4], ...(Array.isArray(product[10]) ? product[10] : [])].filter(Boolean);
  const dots = document.getElementById("galleryDots");
  const label = document.getElementById("galleryColorLabel");
  const hint = document.getElementById("gallerySwipeHint");
  const gallery = document.getElementById("detailGallery");
  let active = 0;
  dots.innerHTML = "";
  label.hidden = true;
  hint.hidden = images.length < 2;
  const show = index => {
    active = (index + images.length) % images.length;
    const src = images[active];
    const image = document.getElementById("detailImage");
    image.style.opacity = "0.35";
    image.src = /^(https?:\/\/|data:image\/)/i.test(src) ? src : `https://images.unsplash.com/${src}?auto=format&fit=crop&w=700&q=85`;
    image.alt = `${product[0]} photo ${active+1}`;
    image.onload = () => { image.style.opacity = "1"; };
    dots.querySelectorAll("button").forEach((dot,i)=>dot.classList.toggle("active",i===active));
  };
  images.forEach((_,index)=>{
    const dot=document.createElement("button"); dot.type="button"; dot.setAttribute("aria-label",`View product photo ${index+1}`);
    dot.addEventListener("click",()=>show(index)); dots.appendChild(dot);
  });
  if (!gallery.dataset.swipeReady) {
    let startX=0,startY=0;
    gallery.addEventListener("touchstart",event=>{const t=event.changedTouches[0];startX=t.clientX;startY=t.clientY;},{passive:true});
    gallery.addEventListener("touchend",event=>{
      const t=event.changedTouches[0],dx=t.clientX-startX,dy=t.clientY-startY;
      if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2 && typeof gallery._swipeGallery === "function") gallery._swipeGallery(dx<0?1:-1);
    },{passive:true});
    gallery.dataset.swipeReady="1";
  }
  gallery._swipeGallery = direction => show(active+direction);
  show(0);
}


const FEEDBACK_KEY="pinoycart_customer_feedback_v1";
// Storefront has its own escaping helper; admin.js is a separate page and its
// escapeHTML() function is not available here.
function escapeFeedbackHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[character]);
}
let currentDetailProductId=null;
window.addEventListener("storage",event=>{if(event.key===FEEDBACK_KEY && currentDetailProductId!==null)renderCustomerFeedback(currentDetailProductId);});
function getFeedback(){try{const value=JSON.parse(localStorage.getItem(FEEDBACK_KEY)||"[]");return Array.isArray(value)?value.filter(x=>x&&typeof x==="object"):[]}catch(e){return []}}
function saveFeedback(a){localStorage.setItem(FEEDBACK_KEY,JSON.stringify(Array.isArray(a)?a:[]))}
function renderCustomerFeedback(pid){
  const el=document.getElementById("customerFeedbackList");
  if(!el)return;
  try{
    const a=getFeedback().filter(x=>String(x.productId)===String(pid));
    if(!a.length){el.innerHTML='<p class="feedback-empty">No feedback yet. Be the first to share your experience.</p>';return;}
    const reviews=a.slice().reverse();
    el.dataset.reviewCount=String(reviews.length);
    el.classList.toggle("has-scroll-feedback",reviews.length>=4);
    el.innerHTML=reviews.map(x=>{
      const rating=Math.max(0,Math.min(5,Number(x.rating)||0));
      return `<article class="customer-feedback-item"><div class="feedback-item-head"><strong>${escapeFeedbackHTML(x.name||"Customer")}</strong><span>${"★".repeat(rating)}${"☆".repeat(5-rating)}</span></div><small>Store: ${escapeFeedbackHTML(x.storeName||"Store")} · ${escapeFeedbackHTML(x.date||"")}</small><p>${escapeFeedbackHTML(x.comment||"")}</p>${x.reply?`<div class="store-reply"><strong>↳ ${escapeFeedbackHTML(x.storeName||"Store")} replied</strong><p>${escapeFeedbackHTML(x.reply)}</p></div>`:""}</article>`;
    }).join("");
    // On phones, keep long review lists in their own vertically swipeable area.
    if(reviews.length>=4){
      el.insertAdjacentHTML("beforeend",'<p class="feedback-scroll-hint" aria-hidden="true"><span>↓</span> Swipe up / scroll down to see more feedback</p>');
    }
  }catch(error){
    console.error("Could not display customer feedback:",error);
    el.innerHTML='<p class="feedback-empty">Customer feedback is temporarily unavailable.</p>';
  }
}

const IS_PRODUCT_DETAILS_PAGE = document.body.classList.contains("product-page");

function openProductDetails(id) {
  if (!IS_PRODUCT_DETAILS_PAGE) {
    window.location.href = `product.html?id=${encodeURIComponent(id)}`;
    return;
  }
  currentDetailProductId=id;
  const p = products[id];
  if (!p) return;
  const discount = Math.round((1 - p[2] / p[3]) * 100);
  const baseDetailImage = p[4] && /^(https?:\/\/|data:image\/)/i.test(p[4]) ? p[4] : `https://images.unsplash.com/${p[4]}?auto=format&fit=crop&w=700&q=85`;
  document.getElementById("detailImage").src = baseDetailImage;
  document.getElementById("detailImage").alt = p[0];
  document.getElementById("detailName").textContent = p[0];
  // Feedback is optional content: a malformed saved review must never block product details.
  try { renderCustomerFeedback(id); }
  catch (feedbackError) {
    console.error("Customer feedback display error:", feedbackError);
    const feedbackList = document.getElementById("customerFeedbackList");
    if (feedbackList) feedbackList.innerHTML = '<p class="feedback-empty">No feedback could be displayed right now.</p>';
  }
  const productRating = Number.isFinite(Number(p[12])) ? Number(p[12]) : 4.8;
  const productRatingCount = Number.isFinite(Number(p[11])) ? Number(p[11]) : 120;
  const productSold = Number.isFinite(Number(p[13])) ? Number(p[13]) : 0;
  document.getElementById("detailRating").textContent = `★★★★★  ${productRating.toFixed(1)} out of 5  |  ${productRatingCount.toLocaleString("en-PH")} ratings`;
  document.getElementById("detailPrice").textContent = money(p[2]);
  document.getElementById("detailOldPrice").textContent = money(p[3]);
  document.getElementById("detailDiscount").textContent = discount + "% OFF";
  document.getElementById("detailDescription").textContent = productDescription(p);
  document.getElementById("detailRatingLarge").textContent = `${productRating.toFixed(1)} / 5`;
  document.getElementById("detailReviewCount").textContent = `Based on ${productRatingCount.toLocaleString("en-PH")} ratings · ${productSold.toLocaleString("en-PH")} sold`;
  const sizePicker = document.getElementById("fashionSizePicker");
  const sizeSelect = document.getElementById("detailSize");
  const colorPicker = document.getElementById("fashionColorPicker");
  const colorSelect = document.getElementById("detailColor");
  const sizeStockNote = document.getElementById("detailSizeStock");
  // Fashion products always go through the option-selection panel. T-shirts require both color and size; bags/other fashion items require color only.
  const hasVariants = hasColorVariants(p);
  const needsSize = p && p[1] === "Fashion" && fashionNeedsSize(p);
  sizePicker.hidden = !needsSize;
  colorPicker.hidden = !hasVariants;
  sizeSelect.innerHTML = '<option value="">Select size</option>';
  colorSelect.innerHTML = '<option value="">Select color</option>';
  const colorChoices = document.getElementById("detailColorChoices");
  const sizeChoices = document.getElementById("detailSizeChoices");
  if (colorChoices) colorChoices.innerHTML = "";
  if (sizeChoices) sizeChoices.innerHTML = "";
  if (!hasVariants) {
    document.getElementById("galleryDots").innerHTML = "";
    document.getElementById("galleryColorLabel").hidden = true;
    document.getElementById("gallerySwipeHint").hidden = true;
  }
  if (!hasVariants) setupExtraProductGallery(p);
  if (hasVariants) {
    const availableColors = fashionColors(p);
    availableColors.forEach(color => {
      const option = document.createElement("option");
      option.value = color; option.textContent = color; colorSelect.appendChild(option);
      if (colorChoices) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "color-swatch";
        button.setAttribute("aria-label", "Choose " + color);
        button.setAttribute("aria-pressed", "false");
        const swatch = document.createElement("span");
        swatch.className = "color-swatch-dot";
        const known = {"black":"#171717","white":"#ffffff","red":"#df3344","blue":"#2864b5","green":"#25875a","yellow":"#f2ca35","pink":"#ed91b5","purple":"#8052a5","orange":"#f28b32","gray":"#999999","grey":"#999999","brown":"#805b43"};
        swatch.style.background = known[String(color).toLowerCase()] || "#dddddd";
        const name = document.createElement("span"); name.textContent = color;
        button.append(swatch,name);
        button.addEventListener("click",()=>{colorSelect.value=color;colorSelect.dispatchEvent(new Event("change",{bubbles:true}));});
        colorChoices.appendChild(button);
      }
    });
    setupDetailGallery(availableColors, p);
    function refreshSizeOptions() {
      sizeSelect.innerHTML = '<option value="">Select size</option>';
      if (sizeChoices) sizeChoices.innerHTML = "";
      if (!needsSize) {
        const stock = fashionStock(p, colorSelect.value);
        sizeStockNote.textContent = colorSelect.value ? `${stock} pieces available` : "Choose a color to see available stock.";
        return;
      }
      FASHION_SIZES.forEach(size => {
        const stock = fashionStock(p, colorSelect.value, size);
        const option = document.createElement("option");
        option.value = size; option.textContent = `${size} — ${stock > 0 ? stock + " in stock" : "Out of stock"}`;
        option.disabled = !colorSelect.value || stock <= 0; sizeSelect.appendChild(option);
        if (sizeChoices) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "size-choice" + (stock <= 0 || !colorSelect.value ? " is-unavailable" : "");
          button.textContent = size;
          button.disabled = stock <= 0 || !colorSelect.value;
          button.setAttribute("aria-pressed","false");
          button.title = stock > 0 ? stock + " in stock" : "Out of stock";
          button.addEventListener("click",()=>{sizeSelect.value=size;sizeSelect.dispatchEvent(new Event("change",{bubbles:true}));});
          sizeChoices.appendChild(button);
        }
      });
      sizeStockNote.textContent = "Choose a color and size to see available stock.";
    }
    colorSelect.onchange = () => {
      if (colorChoices) colorChoices.querySelectorAll(".color-swatch").forEach(btn => {
        const selected = btn.getAttribute("aria-label") === "Choose " + colorSelect.value;
        btn.classList.toggle("is-selected", selected); btn.setAttribute("aria-pressed", String(selected));
      });
      refreshSizeOptions();
      const chosenIndex = availableColors.indexOf(colorSelect.value);
      if (chosenIndex >= 0 && chosenIndex !== activeDetailColorIndex) setDetailGalleryColor(chosenIndex, availableColors, p);
    };
    sizeSelect.onchange = () => {
      const stock = fashionStock(p, colorSelect.value, sizeSelect.value);
      if (sizeChoices) sizeChoices.querySelectorAll(".size-choice").forEach(btn => {
        const selected = btn.textContent === sizeSelect.value;
        btn.classList.toggle("is-selected", selected); btn.setAttribute("aria-pressed", String(selected));
      });
      sizeStockNote.textContent = sizeSelect.value ? `${stock} pieces available` : "Choose a color and size to see available stock.";
    };
    refreshSizeOptions();
  }
  document.getElementById("detailAddButton").onclick = () => {
    const size = needsSize ? sizeSelect.value : "";
    const color = hasVariants ? colorSelect.value : "";
    if (hasVariants && (!color || (needsSize && !size))) { alert(needsSize ? "Please choose a color and size first." : "Please choose a color first."); return; }
    if (hasVariants && fashionStock(p, color, size) <= 0) { alert("This color/size is out of stock."); return; }
    addToCart(id, color, size);
    showAddCartSuccess();
  };
  document.getElementById("detailBuyButton").onclick = () => {
    const size = needsSize ? sizeSelect.value : "";
    const color = hasVariants ? colorSelect.value : "";
    if (hasVariants && (!color || (needsSize && !size))) { alert(needsSize ? "Please choose a color and size first." : "Please choose a color first."); return; }
    if (hasVariants && fashionStock(p, color, size) <= 0) { alert("This color/size is out of stock."); return; }
    buyNow(id, color, size);
  };
  document.getElementById("productModal").classList.add("show");
}
function openProductFeedback(id) {
  if (!IS_PRODUCT_DETAILS_PAGE) {
    window.location.href = `product.html?id=${encodeURIComponent(id)}#feedback`;
    return;
  }
  openProductDetails(id);
  // Move the product-details panel directly to its Customer feedback section.
  requestAnimationFrame(() => {
    const panel = document.querySelector(".product-detail-panel");
    const feedback = document.querySelector(".customer-feedback");
    if (!panel || !feedback) return;
    const panelTop = panel.getBoundingClientRect().top;
    const feedbackTop = feedback.getBoundingClientRect().top;
    if (IS_PRODUCT_DETAILS_PAGE) feedback.scrollIntoView({behavior:"smooth", block:"start"});
    else panel.scrollTo({ top: panel.scrollTop + feedbackTop - panelTop - 14, behavior: "smooth" });
  });
}
function closeProductDetails() {
  if (IS_PRODUCT_DETAILS_PAGE) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("productModal").classList.remove("show");
}
function closeProductOutside(event) {
  if (event.target.id === "productModal") closeProductDetails();
}

function renderProducts() {
  const query = document.getElementById("search").value.toLowerCase();
  const filtered = products.map((p, i) => p ? ({...p, id:i}) : null)
    .filter(p => p && !p[16] && (selectedCategory === "All" || p[1] === selectedCategory || (selectedCategory === "Home" && p[1] === "Home & Living")) && p[0].toLowerCase().includes(query));
  document.getElementById("productCount").textContent = filtered.length + " products";
  const motionStyles = ["pc-anim-pop", "pc-anim-slide", "pc-anim-zoom"];
  document.getElementById("products").innerHTML = filtered.map((p, index) => {
    const discount = Math.round((1 - p[2] / p[3]) * 100);
    const motion = motionStyles[Math.floor(Math.random() * motionStyles.length)];
    const delay = Math.min(index % 10, 9) * 55;
    return `<article class="product ${motion}" style="animation-delay:${delay}ms">
      <div class="discount">${discount}% OFF</div>
      <button class="product-image-button" onclick="openProductDetails(${p.id})" aria-label="View ${p[0]} details">
        <img src="${productImage(p)}" alt="${p[0]}" loading="lazy">
      </button>
      <div class="info">
        <button class="product-name-button name" onclick="openProductDetails(${p.id})"><span class="mall-badge"><span class="mall-check">✓</span> MALL</span>${p[0]}</button>
        <div class="price-row"><div class="price">${money(p[2])}</div><span class="sold-count">${Number.isFinite(Number(p[13])) ? Number(p[13]).toLocaleString("en-PH") + " sold" : getSoldLabel(p.id)}</span></div>
        <div class="old">${money(p[3])}</div><button type="button" class="sold rating-link" onclick="openProductFeedback(${p.id})" aria-label="View customer feedback and ratings">⭐ ${(Number.isFinite(Number(p[12])) ? Number(p[12]) : 4.8).toFixed(1)} | ${(Number.isFinite(Number(p[11])) ? Number(p[11]) : 120).toLocaleString("en-PH")} ratings</button>
        <div class="actions">
          <button class="buy" onclick="buyNow(${p.id})">BUY NOW</button>
          <button class="add" onclick="addToCart(${p.id})">🛒 ADD TO CART</button>
        </div>
      </div></article>`;
  }).join("");
  if (!filtered.length) document.getElementById("products").innerHTML = "<p>No products found.</p>";
}

function filterCategory(category, button) {
  selectedCategory = category;
  document.querySelectorAll(".categories button").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
}

function addToCart(id, color = "", size = "") {
  const product = products[id];
  if (product && product[1] === "Fashion") {
    if (!color || (fashionNeedsSize(product) && !size)) { openProductDetails(id); return; }
  } else if (product && hasColorVariants(product)) {
    if (!color || (fashionNeedsSize(product) && !size)) { openProductDetails(id); return; }
    const stock = fashionStock(product, color, size);
    const currentQty = cart.filter(item => item.id === id && item.color === color && (item.size || "") === (size || "")).reduce((sum,item) => sum + item.qty, 0);
    if (currentQty >= stock) { alert("You have reached the available stock for this color/size."); return; }
  }
  const item = cart.find(p => p.id === id && (p.color || "") === color && (p.size || "") === size);
  if (item) item.qty++;
  else cart.push({id, qty:1, ...(color ? {color} : {}), ...(size ? {size} : {})});
  saveCart(); updateCart();
}
let addCartSuccessTimer;
function showAddCartSuccess() {
  const popup = document.getElementById("addCartSuccess");
  if (!popup) return;
  clearTimeout(addCartSuccessTimer);
  popup.classList.add("show");
  popup.setAttribute("aria-hidden", "false");
  addCartSuccessTimer = setTimeout(() => {
    popup.classList.remove("show");
    popup.setAttribute("aria-hidden", "true");
  }, 500); // Hide the check-only notification after 500 milliseconds.
}
function continueShopping() {
  const popup = document.getElementById("addCartSuccess");
  if (popup) { popup.classList.remove("show"); popup.setAttribute("aria-hidden", "true"); }
  // Continue shopping always returns customers to the PinoyCart home page
  // when the confirmation was opened from the dedicated product details page.
  if (IS_PRODUCT_DETAILS_PAGE) {
    window.location.href = "index.html";
    return;
  }
  closeProductDetails();
}
function viewCartAfterAdd() {
  const popup = document.getElementById("addCartSuccess");
  if (popup) { popup.classList.remove("show"); popup.setAttribute("aria-hidden", "true"); }
  openCart();
}

function buyNow(id, color = "", size = "") {
  const product = products[id];
  if (product && hasColorVariants(product) && (!color || (fashionNeedsSize(product) && !size))) { openProductDetails(id); return; }
  cart = [{id, qty:1, ...(color ? {color} : {}), ...(size ? {size} : {})}];
  saveCart();
  window.location.href = "checkout.html";
}

let lastDisplayedCartCount = null;
function updateCart() {
  const cartCount = cart.reduce((s,p) => s + p.qty, 0);
  const countBadge = document.getElementById("count");
  const cartButton = document.querySelector(".cart-icon");
  countBadge.textContent = cartCount;
  if (lastDisplayedCartCount !== null && cartCount !== lastDisplayedCartCount) {
    countBadge.classList.remove("cart-count-pop");
    cartButton.classList.remove("cart-icon-bounce");
    // Restart the animation even when updates happen quickly.
    void countBadge.offsetWidth;
    countBadge.classList.add("cart-count-pop");
    cartButton.classList.add("cart-icon-bounce");
  }
  lastDisplayedCartCount = cartCount;
  let total = 0;
  const container = document.getElementById("cartItems");
  if (!cart.length) {
    container.innerHTML = '<div class="empty">🛒<h3>Your cart is empty</h3><p>Start shopping now!</p></div>';
  } else {
    container.innerHTML = cart.map(item => {
      const p = products[item.id]; if (!p) return ""; total += p[2] * item.qty;
      return `<div class="cart-item">
        <img src="${productImage(p)}" alt="${p[0]}">
        <div class="cart-details">${p[0]}${item.color ? `<small>Color: ${item.color}</small>` : ""}${item.size ? `<small>Size: ${item.size}</small>` : ""}<strong>${money(p[2])}</strong>
          <div class="qty"><button onclick="changeQty(${item.id},-1,'${item.color || ""}','${item.size || ""}')">−</button>${item.qty}
          <button onclick="changeQty(${item.id},1,'${item.color || ""}','${item.size || ""}')">+</button>
          <button class="remove" onclick="removeItem(${item.id},'${item.color || ""}','${item.size || ""}')">Remove</button></div>
        </div></div>`;
    }).join("");
  }
  document.getElementById("subtotal").textContent = money(total);

  // Show Continue Shopping when the cart is empty; otherwise show checkout.
  const actionButton = document.getElementById("cartActionButton");
  if (actionButton) {
    actionButton.textContent = cart.length ? "PROCEED TO CHECKOUT" : "CONTINUE SHOPPING";
    actionButton.setAttribute("aria-label", cart.length ? "Proceed to checkout" : "Continue shopping");
  }
}
function cartBottomAction() {
  if (!cart.length) {
    closeCart();
    return;
  }
  goToCheckout();
}
function changeQty(id, amount, color = "", size = "") {
  const item = cart.find(p => p.id === id && (p.color || "") === color && (p.size || "") === size);
  if (!item) return;
  const product = products[id];
  if (amount > 0 && product && hasColorVariants(product) && item.qty >= fashionStock(product, color, size)) {
    alert("No more stock available for this color/size.");
    return;
  }
  item.qty += amount;
  if (item.qty <= 0) removeItem(id, color, size);
  saveCart(); updateCart();
}
function removeItem(id, color = "", size = "") { cart = cart.filter(p => !(p.id === id && (p.color || "") === color && (p.size || "") === size)); saveCart(); updateCart(); }
function openCart() { updateCart(); document.getElementById("overlay").classList.add("show"); }
function closeCart() { document.getElementById("overlay").classList.remove("show"); }
function outsideClose(event) { if (event.target.id === "overlay") closeCart(); }
function goToCheckout() {
  if (!cart.length) { alert("Your shopping cart is empty!"); return; }
  window.location.href = "checkout.html";
}

renderProducts();
updateCart();
loadPancakeStorefrontProducts();

function initializeProductDetailsPage() {
  if (!IS_PRODUCT_DETAILS_PAGE) return;
  const requestedId = Number(new URLSearchParams(window.location.search).get("id"));
  if (Number.isInteger(requestedId) && products[requestedId]) {
    openProductDetails(requestedId);
    if (window.location.hash === "#feedback") {
      requestAnimationFrame(() => {
        const panel = document.querySelector(".product-detail-panel");
        const feedback = document.querySelector(".customer-feedback");
        if (panel && feedback) feedback.scrollIntoView({behavior:"smooth", block:"start"});
      });
    }
  } else {
    window.location.replace("index.html");
  }
}

