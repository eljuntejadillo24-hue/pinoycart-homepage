// Use the same catalog source as the storefront. Saved admin/catalog edits in
// localStorage can change product indices, so checkout must prefer that catalog.
let catalogSource = window.PINOYCART_PRODUCTS || [];
try {
  const savedCatalog = JSON.parse(localStorage.getItem("pinoycart_products") || "null");
  if (Array.isArray(savedCatalog) && savedCatalog.length) catalogSource = savedCatalog;
} catch (error) {
  console.warn("Checkout: saved product catalog could not be read; using defaults.", error);
}
const products = (Array.isArray(catalogSource) ? catalogSource : []).map(product => {
  if (product && product[1] === "Fashion") {
    const old = product[5] || {M:10,L:10,XL:10,"2XL":10,"3XL":10};
    if (!old.colors || !old.stock) product[5] = {colors:["Black"],stock:{Black:{...old}}};
  }
  return product;
});
// Compatibility fallback for the Pancake POS test item (cart ID 30).
// Some older catalogs contain only the 30 standard products (IDs 0-29).
if (cartHasTestItemId30()) {
  // Ensure index 30 exists (catalog indices 0-29 are the 30 standard items).
  while (products.length <= 30) products.push(null);
  if (!products[30]) products[30] = ["Pancake POS Integration Test Item","Integration Test",499,499,"photo-1505740420928-5e560c06d30e"];
}
function cartHasTestItemId30() {
  try {
    const storedCart = JSON.parse(localStorage.getItem("pinoycart_cart") || "[]");
    return Array.isArray(storedCart) && storedCart.some(item => Number(item.id) === 30);
  } catch { return false; }
}
function fashionNeedsSize(product) { return product && product[1] === "Fashion" && (!product[8] || product[8] === "T-Shirt"); }
function hasColorVariants(product) { return !!(product && product[5] && Array.isArray(product[5].colors) && product[5].colors.length); }
function fashionStock(product, color, size = "") {
  const entry = product && product[5] && product[5].stock && product[5].stock[color];
  if (fashionNeedsSize(product)) return Number(entry && entry[size] || 0);
  return Number(typeof entry === "number" ? entry : entry && entry.__stock || 0);
}
const money = n => "₱" + n.toLocaleString("en-PH");
let cart = JSON.parse(localStorage.getItem("pinoycart_cart") || "[]");
// Keep live Pancake cart item IDs until the catalog fetch below resolves.

function renderSummary() {
  const container = document.getElementById("summaryItems");
  let subtotal = 0, itemCount = 0;
  if (!cart.length) {
    container.innerHTML = '<p class="help-text">Your cart is empty. <a href="index.html">Return to shopping</a>.</p>';
  } else {
    container.innerHTML = cart.map((item, index) => {
      const p = products[item.id];
      if (!p) return "";
      subtotal += p[2] * item.qty;
      itemCount += item.qty;
      return `<div class="summary-product">
        <img src="${p[4] && /^(https?:\/\/|data:image\/)/i.test(p[4]) ? p[4] : `https://images.unsplash.com/${p[4]}?auto=format&fit=crop&w=120&q=70`}" alt="${p[0]}">
        <div class="summary-product-info">${p[0]}${item.color ? `<br><small>Color: ${item.color}</small>` : ""}${item.size ? `<br><small>Size: ${item.size}</small>` : ""}<br><strong>${money(p[2])}</strong>
          <div class="summary-qty" aria-label="Change quantity for ${p[0]}">
            <button type="button" onclick="changeCheckoutQty(${index},-1)" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button type="button" onclick="changeCheckoutQty(${index},1)" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  const qualifiesForFreeShipping = itemCount >= 2;
  document.getElementById("totalItems").textContent = itemCount;
  document.getElementById("summarySubtotal").textContent = money(subtotal);
  document.getElementById("deliveryFee").textContent = qualifiesForFreeShipping ? "FREE" : "To be confirmed";
  document.getElementById("deliveryFee").classList.toggle("free-shipping", qualifiesForFreeShipping);
  const promo = document.getElementById("shippingPromo");
  promo.textContent = qualifiesForFreeShipping
    ? "🎉 FREE SHIPPING unlocked — thank you for shopping!"
    : "Add " + (2 - itemCount) + " more item to unlock FREE SHIPPING!";
  promo.classList.toggle("unlocked", qualifiesForFreeShipping);
  // Delivery is free once the cart contains at least 2 total pieces.
  document.getElementById("orderTotal").textContent = money(subtotal);
  if (!cart.length) document.querySelector(".place-order").disabled = true;
  else document.querySelector(".place-order").disabled = false;
}

function changeCheckoutQty(index, change) {
  const item = cart[index];
  if (!item) return;
  const product = products[item.id];
  if (change > 0 && product && (product[1] === "Fashion" || hasColorVariants(product))) {
    const stock = fashionStock(product, item.color, item.size);
    if (item.qty >= stock) { alert("No more stock available for this color and size."); return; }
  }
  item.qty = Math.max(1, Number(item.qty) + change);
  localStorage.setItem("pinoycart_cart", JSON.stringify(cart));
  renderSummary();
}

async function loadOptions(url, select, placeholder) {
  select.disabled = true;
  select.innerHTML = `<option value="">Loading ${placeholder.toLowerCase()}...</option>`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load address list");
    const items = await response.json();
    items.sort((a,b) => a.name.localeCompare(b.name));
    select.innerHTML = `<option value="">Choose ${placeholder.toLowerCase()}</option>` +
      items.map(item => `<option value="${item.code}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
    select.disabled = false;
    updateAddressPicker(select);
    return true;
  } catch (error) {
    select.innerHTML = `<option value="">Unable to load - check internet</option>`;
    document.getElementById("addressStatus").textContent =
      "Could not load the official address list. Check your internet connection and reload this page.";
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

const province = document.getElementById("province");
const city = document.getElementById("city");
const barangay = document.getElementById("barangay");

function resetSelect(select, message) {
  select.innerHTML = `<option value="">${message}</option>`;
  select.disabled = true;
  updateAddressPicker(select);
}

async function initAddress() {
  province.disabled = true;
  province.innerHTML = '<option value="">Loading provinces...</option>';
  try {
    const response = await fetch("https://psgc.gitlab.io/api/provinces/");
    if (!response.ok) throw new Error("Could not load provinces");
    const items = await response.json();
    items.sort((a,b) => a.name.localeCompare(b.name));
    province.innerHTML = '<option value="">Choose province / NCR</option>' +
      '<option value="NCR" data-name="National Capital Region (NCR)">National Capital Region (NCR)</option>' +
      items.map(item => `<option value="${item.code}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
    province.disabled = false;
    updateAddressPicker(province);
  } catch (error) {
    province.innerHTML = '<option value="">Unable to load - check internet</option>';
    document.getElementById("addressStatus").textContent =
      "Could not load the official province list. Check your internet connection and reload this page.";
  }
}

async function loadCitiesForNcr() {
  resetSelect(city, "Loading cities...");
  resetSelect(barangay, "Choose city first");
  try {
    const response = await fetch("https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/");
    if (!response.ok) throw new Error("Could not load NCR cities");
    const items = await response.json();
    fillSelect(city, items, "Choose city / municipality");
  } catch {
    resetSelect(city, "Unable to load cities");
    document.getElementById("addressStatus").textContent =
      "Could not load NCR cities. Check your internet connection and try again.";
  }
}

function fillSelect(select, items, placeholder) {
  items.sort((a,b) => a.name.localeCompare(b.name));
  select.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(item => `<option value="${item.code}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  select.disabled = false;
  updateAddressPicker(select);
}

const addressModal = document.getElementById("addressModal");
const addressOptionList = document.getElementById("addressOptionList");
let activeAddressSelect = null;
const pickerButtons = {province: document.getElementById("provincePicker"), city: document.getElementById("cityPicker"), barangay: document.getElementById("barangayPicker")};

function updateAddressPicker(select) {
  const button = pickerButtons[select.id];
  if (!button) return;
  const value = select.value ? selectedText(select) : (select.options[0]?.text || "Choose location");
  button.querySelector(".picker-value").textContent = value;
  button.disabled = select.disabled;
  button.classList.toggle("has-value", Boolean(select.value));
}

function renderAddressOptions() {
  if (!activeAddressSelect) return;
  const options = Array.from(activeAddressSelect.options).filter(option => option.value);
  addressOptionList.innerHTML = options.length ? options.map(option => `
    <button type="button" class="address-option ${option.value === activeAddressSelect.value ? "selected" : ""}" data-address-value="${escapeHtml(option.value)}">
      <span>${escapeHtml(option.text)}</span><span class="address-option-check">${option.value === activeAddressSelect.value ? "✓" : ""}</span>
    </button>`).join("") : '<p class="address-empty">No matching location found.</p>';
}

function openAddressPicker(select) {
  if (select.disabled) return;
  activeAddressSelect = select;
  document.getElementById("addressModalTitle").textContent = select.id === "province" ? "Choose province / NCR" : select.id === "city" ? "Choose city / municipality" : "Choose barangay";
  renderAddressOptions();
  addressModal.classList.add("show");
  addressModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("address-modal-open");
}

function closeAddressPicker() {
  addressModal.classList.remove("show");
  addressModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("address-modal-open");
  activeAddressSelect = null;
}

Object.entries(pickerButtons).forEach(([id, button]) => button.addEventListener("click", () => openAddressPicker(document.getElementById(id))));
addressOptionList.addEventListener("click", event => {
  const optionButton = event.target.closest("[data-address-value]");
  if (!optionButton || !activeAddressSelect) return;
  activeAddressSelect.value = optionButton.dataset.addressValue;
  activeAddressSelect.dispatchEvent(new Event("change", {bubbles:true}));
  updateAddressPicker(activeAddressSelect);
  closeAddressPicker();
});
document.getElementById("closeAddressModal").addEventListener("click", closeAddressPicker);
addressModal.addEventListener("click", event => { if (event.target.hasAttribute("data-close-address")) closeAddressPicker(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && addressModal.classList.contains("show")) closeAddressPicker(); });

province.addEventListener("change", async () => {
  resetSelect(city, "Choose province first");
  resetSelect(barangay, "Choose city first");
  if (!province.value) return;
  if (province.value === "NCR") {
    await loadCitiesForNcr();
  } else {
    await loadOptions(
      `https://psgc.gitlab.io/api/provinces/${province.value}/cities-municipalities/`,
      city,
      "City / municipality"
    );
  }
});

city.addEventListener("change", async () => {
  resetSelect(barangay, "Choose city first");
  if (city.value) {
    await loadOptions(
      `https://psgc.gitlab.io/api/cities-municipalities/${city.value}/barangays/`,
      barangay,
      "Barangay"
    );
  }
});

document.getElementById("orderForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!cart.length) return;
  if (!province.value || !city.value || !barangay.value) {
    alert("Please select your province, city/municipality, and barangay.");
    const firstMissing = !province.value ? province : !city.value ? city : barangay;
    openAddressPicker(firstMissing);
    return;
  }
  if (!event.target.reportValidity()) return;
  for (const item of cart) {
    const product = products[item.id];
    if (product && (product[1] === "Fashion" || hasColorVariants(product))) {
      const stock = fashionStock(product, item.color, item.size);
      if (!item.color || (fashionNeedsSize(product) && !item.size) || item.qty > stock) {
        alert(`Insufficient stock for ${product[0]} color ${item.color || "(not selected)"}${fashionNeedsSize(product) ? ` size ${item.size || "(not selected)"}` : ""}. Please return to your cart.`);
        return;
      }
    }
  }
  const order = {
    fullname: document.getElementById("fullname").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    province: selectedText(province),
    city: selectedText(city),
    barangay: selectedText(barangay),
    street: document.getElementById("street").value.trim(),
    payment: document.querySelector('input[name="payment"]:checked').value,
    items: cart.map(item => { const product = products[item.id]; return { ...item, ...(product && product[14] && product[15] ? { pancake_product_id: product[14], pancake_variation_id: product[15] } : {}) }; }),
    total: cart.reduce((sum,item) => sum + (products[item.id] ? products[item.id][2] * item.qty : 0), 0)
  };
  // Submit customer orders to the PinoyCart backend. API keys stay on the server.
  const submitButton = document.querySelector(".place-order");
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "SUBMITTING ORDER...";
  try {
    const response = await fetch("https://pinoycart-website1-backend.onrender.com/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || "The order could not be submitted. Please try again.");
    window.PINOYCART_LAST_ORDER_ID = result.orderId;
  } catch (error) {
    alert(error.message || "Unable to submit your order. Please check your internet connection and try again.");
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    return;
  }
  cart.forEach(item => {
    const product = products[item.id];
    if (product && (product[1] === "Fashion" || hasColorVariants(product)) && product[5]) {
      const entry = product[5].stock[item.color];
      if (fashionNeedsSize(product)) entry[item.size] = Math.max(0, Number(entry[item.size] || 0) - item.qty);
      else product[5].stock[item.color] = Math.max(0, Number(typeof entry === "number" ? entry : entry && entry.__stock || 0) - item.qty);
    }
  });
  localStorage.setItem("pinoycart_products", JSON.stringify(products.map((product, index) => index >= 31 ? null : product)));
  document.getElementById("successOverlay").classList.add("show");
  localStorage.removeItem("pinoycart_cart");
});
function selectedText(select) {
  return select.options[select.selectedIndex]?.text || "";
}
function finishDemo() { window.location.href = "index.html"; }

async function initializeCheckoutCatalog() {
  try {
    const response = await fetch('https://pinoycart-website1-backend.onrender.com/api/products/pancake', { cache: 'no-store' });
    const result = await response.json();
    if (response.ok && result.success && Array.isArray(result.products)) {
      result.products.forEach(item => {
        let id = 31;
        while (products[id]) id++;
        const imageRef = item.image && (String(item.image).startsWith('http') || String(item.image).startsWith('data:image'))
          ? String(item.image) : 'photo-1505740420928-5e560c06d30e';
        products[id] = [item.name, 'Pancake POS', Number(item.price), Number(item.price), imageRef, null, null, null, null, null, null, 0, 0, 0, String(item.product_id), String(item.variation_id), String(item.sku || ''), Number(item.stock || 0)];
      });
    }
  } catch (error) {
    console.warn('Checkout live Pancake catalog fetch failed.', error);
  }
  cart = cart.filter(item => products[item.id]);
  renderSummary();
  initAddress();
}
initializeCheckoutCatalog();
