// Shared product catalog used by checkout.js.
// Keep product order and IDs consistent with script.js.
const DEFAULT_PINOYCART_PRODUCTS = [
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
  ["LED Desk Light","Home",299,499,"photo-1507473885765-e6ed057f782c"]
];
try {
  const savedProducts = localStorage.getItem("pinoycart_products");
  const parsedProducts = savedProducts ? JSON.parse(savedProducts) : null;
  // An empty saved array should not hide the default product catalog.
  window.PINOYCART_PRODUCTS = Array.isArray(parsedProducts) && parsedProducts.length
    ? parsedProducts
    : DEFAULT_PINOYCART_PRODUCTS.slice();
  window.PINOYCART_PRODUCTS = window.PINOYCART_PRODUCTS.map(product => {
    if (product && product[1] === "Fashion") {
      const old = product[5] || {M:10,L:10,XL:10,"2XL":10,"3XL":10};
      if (!old.colors || !old.stock) product[5] = {colors:["Black"],stock:{Black:{...old}}};
    }
    return product;
  });
} catch {
  window.PINOYCART_PRODUCTS = DEFAULT_PINOYCART_PRODUCTS.slice().map(product => {
    if (product && product[1] === "Fashion") {
      const old = product[5] || {M:10,L:10,XL:10,"2XL":10,"3XL":10};
      if (!old.colors || !old.stock) product[5] = {colors:["Black"],stock:{Black:{...old}}};
    }
    return product;
  });
}
