import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Phone, ShieldCheck, WhatsappLogo, X } from "@phosphor-icons/react";
import catalogData from "./data/catalog.json";
import { Product } from "./data/catalog";
import "./elko-packs.css";

type PackItemSpec = { productId: string; quantity?: number };
type PackSpec = {
  id: string;
  title: string;
  audience: string;
  hook: string;
  badge: string;
  items: PackItemSpec[];
};
type PackItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
  image: string | null;
  color: string;
  size: string;
  barcode?: string | null;
};
type PreparedPack = PackSpec & {
  count: number;
  discount: number;
  originalTotal: number;
  subtotal: number;
  total: number;
  itemsResolved: PackItem[];
};
type PreparedProduct = {
  id: string;
  title: string;
  audience: string;
  hook: string;
  badge: string;
  product: Product;
  originalTotal: number;
  subtotal: number;
  total: number;
  image: string | null;
  color: string;
  size: string;
  barcode?: string | null;
};
type OrderPayload = {
  id: string;
  customer: Record<string, string>;
  items: { name: string; color: string; size: string; quantity: number; unitPrice: number; lineTotal: number; image: string; barcode?: string | null }[];
  payment: "cash_on_delivery";
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
};

const products = catalogData as Product[];
const elkoProducts = products
  .filter((product) => product.brand.toLowerCase() === "elko" && product.purchasable)
  .sort((a, b) => `${a.category}-${a.name.fr}`.localeCompare(`${b.category}-${b.name.fr}`));
const deliveryFee = 35;
const pendingOrdersKey = "hawana-pending-orders";
const whatsappUrl = "https://api.whatsapp.com/send?phone=212689765468&text=Hawana.ma%20-%20Pack%20ELKO";

const packSpecs: PackSpec[] = [
  {
    id: "elko-homme-start",
    title: "Pack Homme Start",
    audience: "3 pieces",
    hook: "Slip, boxer et t-shirt coton pour refaire les bases.",
    badge: "-20%",
    items: [
      { productId: "elko-men-s-slip-100-cotton" },
      { productId: "elko-boxer-short-100-cotton" },
      { productId: "elko-100-cotton-v-neck-short-sleeve" },
    ],
  },
  {
    id: "elko-homme-essentiel",
    title: "Pack Homme Essentiel",
    audience: "5 pieces",
    hook: "Le pack quotidien: slips, boxers, debardeur et t-shirt.",
    badge: "-25%",
    items: [
      { productId: "elko-men-s-slip-100-cotton" },
      { productId: "elko-boxer-short-100-cotton" },
      { productId: "elko-boxer-brief-100-cotton" },
      { productId: "elko-100-cotton-no-sleeve-v-neck" },
      { productId: "elko-100-cotton-crew-neck-short-sleeve" },
    ],
  },
  {
    id: "elko-homme-complet",
    title: "Pack Homme Complet",
    audience: "7 pieces",
    hook: "Une semaine propre de basiques coton, du boxer au haut.",
    badge: "-30%",
    items: [
      { productId: "elko-men-s-slip-100-cotton" },
      { productId: "elko-boxer-short-100-cotton" },
      { productId: "elko-boxer-brief-100-cotton" },
      { productId: "elko-boxer-long-leg" },
      { productId: "elko-100-cotton-no-sleeve-v-neck" },
      { productId: "elko-100-cotton-v-neck-short-sleeve" },
      { productId: "elko-100-cotton-crew-neck-short-sleeve" },
    ],
  },
  {
    id: "elko-femme-start",
    title: "Pack Femme Start",
    audience: "3 pieces",
    hook: "Slip, top et manches courtes: doux, simple, utile.",
    badge: "-20%",
    items: [
      { productId: "elko-women-s-slip" },
      { productId: "elko-top-bretelles" },
      { productId: "elko-short-sleeves" },
    ],
  },
  {
    id: "elko-femme-essentiel",
    title: "Pack Femme Essentiel",
    audience: "5 pieces",
    hook: "Basiques coton pour la semaine: slip, tops et manches.",
    badge: "-25%",
    items: [
      { productId: "elko-women-s-slip" },
      { productId: "elko-bretelles-wide-band" },
      { productId: "elko-top-bretelles" },
      { productId: "elko-short-sleeves" },
      { productId: "elko-long-sleeves" },
    ],
  },
  {
    id: "elko-femme-complet",
    title: "Pack Femme Complet",
    audience: "7 pieces",
    hook: "Plus de slips, plus de hauts, moins de decisions le matin.",
    badge: "-30%",
    items: [
      { productId: "elko-women-s-slip", quantity: 2 },
      { productId: "elko-bretelles-wide-band" },
      { productId: "elko-top-bretelles" },
      { productId: "elko-short-sleeves", quantity: 2 },
      { productId: "elko-long-sleeves" },
    ],
  },
  {
    id: "elko-couple",
    title: "Pack Couple ELKO",
    audience: "7 pieces",
    hook: "Les basiques coton pour lui et pour elle, dans une seule commande.",
    badge: "-30%",
    items: [
      { productId: "elko-men-s-slip-100-cotton" },
      { productId: "elko-boxer-short-100-cotton" },
      { productId: "elko-100-cotton-no-sleeve-v-neck" },
      { productId: "elko-100-cotton-v-neck-short-sleeve" },
      { productId: "elko-women-s-slip" },
      { productId: "elko-top-bretelles" },
      { productId: "elko-short-sleeves" },
    ],
  },
  {
    id: "elko-premium",
    title: "Pack ELKO Premium",
    audience: "7 pieces",
    hook: "Le plus complet: boxers, hauts homme et essentiels femme.",
    badge: "-30%",
    items: [
      { productId: "elko-boxer-short-100-cotton" },
      { productId: "elko-boxer-brief-100-cotton" },
      { productId: "elko-boxer-long-leg" },
      { productId: "elko-100-cotton-v-neck-short-sleeve" },
      { productId: "elko-bretelles-wide-band" },
      { productId: "elko-short-sleeves" },
      { productId: "elko-long-sleeves" },
    ],
  },
];

const storedOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(pendingOrdersKey) ?? "[]") as OrderPayload[];
  } catch {
    return [];
  }
};

const queueOrder = (order: OrderPayload) => {
  const orders = storedOrders().filter((item) => item.id !== order.id);
  localStorage.setItem(pendingOrdersKey, JSON.stringify([...orders, order]));
};

const sendOrder = (sheetUrl: string, order: OrderPayload) => {
  const body = JSON.stringify(order);
  void fetch(sheetUrl, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body }).catch(() => undefined);
};

const discountForCount = (count: number) => count === 3 ? 0.2 : count === 5 ? 0.25 : 0.3;
const formatPrice = (value: number) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value);
const productById = new Map(products.map((product) => [product.id, product]));

const firstAvailableChoice = (product: Product) => {
  const variant = product.variants?.find((item) => item.stock > 0);
  const color = product.colors.find((item) => item.id === variant?.colorId) ?? product.colors[0];
  return {
    color,
    size: variant?.size ?? product.sizes[0] ?? "A confirmer",
    barcode: variant?.barcode,
  };
};

const preparePack = (pack: PackSpec): PreparedPack => {
  const expanded = pack.items.flatMap((item) => {
    const product = productById.get(item.productId);
    if (!product) return [];
    return Array.from({ length: item.quantity ?? 1 }, () => product);
  });
  const count = expanded.length;
  const discount = discountForCount(count);
  const itemsResolved = expanded.map((product) => {
    const choice = firstAvailableChoice(product);
    const regularPrice = choice.barcode
      ? product.variants?.find((variant) => variant.barcode === choice.barcode)?.regularPrice ?? product.regularPrice
      : product.regularPrice;
    const unitPrice = Math.round((regularPrice ?? product.regularPrice ?? product.price ?? 0) * (1 - discount));
    return {
      product,
      quantity: 1,
      unitPrice,
      image: choice.color?.image ?? product.colors[0]?.image ?? null,
      color: choice.color?.label.fr ?? "A confirmer",
      size: choice.size,
      barcode: choice.barcode,
    };
  });

  const originalTotal = expanded.reduce((sum, product) => sum + (product.regularPrice ?? product.price ?? 0), 0);
  const subtotal = itemsResolved.reduce((sum, item) => sum + item.unitPrice, 0);
  return { ...pack, count, discount: Math.round(discount * 100), originalTotal, subtotal, total: subtotal + deliveryFee, itemsResolved };
};

const prepareProduct = (product: Product): PreparedProduct => {
  const choice = firstAvailableChoice(product);
  const variantPrice = choice.barcode ? product.variants?.find((variant) => variant.barcode === choice.barcode)?.price : null;
  const variantRegularPrice = choice.barcode ? product.variants?.find((variant) => variant.barcode === choice.barcode)?.regularPrice : null;
  const subtotal = Math.round(variantPrice ?? product.price ?? product.regularPrice ?? 0);
  const originalTotal = Math.round(variantRegularPrice ?? product.regularPrice ?? subtotal);
  return {
    id: `single-${product.id}`,
    title: product.name.fr,
    audience: product.category === "homme" ? "Homme" : product.category === "femme" ? "Femme" : "ELKO",
    hook: product.short.fr || product.description.fr || "Produit ELKO disponible chez HAWANA.",
    badge: "A l'unite",
    product,
    originalTotal,
    subtotal,
    total: subtotal + deliveryFee,
    image: choice.color?.image ?? product.colors[0]?.image ?? null,
    color: choice.color?.label.fr ?? "A confirmer",
    size: choice.size,
    barcode: choice.barcode,
  };
};

function ElkoPacksLanding() {
  const [selectedPack, setSelectedPack] = useState<PreparedPack | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PreparedProduct | null>(null);
  const [orderId, setOrderId] = useState("");
  const preparedPacks = useMemo(() => packSpecs.map(preparePack), []);
  const preparedProducts = useMemo(() => elkoProducts.map(prepareProduct), []);
  const activeTitle = selectedPack?.title ?? selectedProduct?.title ?? "";
  const activeBadge = selectedPack?.badge ?? selectedProduct?.badge ?? "";
  const activeSubtotal = selectedPack?.subtotal ?? selectedProduct?.subtotal ?? 0;
  const activeTotal = selectedPack?.total ?? selectedProduct?.total ?? 0;

  const closeOrder = () => {
    setSelectedPack(null);
    setSelectedProduct(null);
  };

  const submitOfferOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPack && !selectedProduct) return;
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(form) as Record<string, string>;
    const id = `HW-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const preference = [customer.sizes, customer.colors].filter(Boolean).join(" / ");
    const items = selectedPack
      ? selectedPack.itemsResolved.map((item) => ({
        name: `${selectedPack.title} - ${item.product.name.fr}`,
        color: customer.colors ? `A confirmer: ${customer.colors}` : item.color,
        size: customer.sizes ? `A confirmer: ${customer.sizes}` : item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.unitPrice * item.quantity,
        image: item.image ? new URL(item.image, window.location.origin).toString() : "",
        barcode: item.barcode,
      }))
      : selectedProduct ? [{
        name: `ELKO - ${selectedProduct.product.name.fr}`,
        color: customer.colors ? `A confirmer: ${customer.colors}` : selectedProduct.color,
        size: customer.sizes ? `A confirmer: ${customer.sizes}` : selectedProduct.size,
        quantity: 1,
        unitPrice: selectedProduct.subtotal,
        lineTotal: selectedProduct.subtotal,
        image: selectedProduct.image ? new URL(selectedProduct.image, window.location.origin).toString() : "",
        barcode: selectedProduct.barcode,
      }] : [];
    const order: OrderPayload = {
      id,
      customer: {
        ...customer,
        pack: activeTitle,
        packDetails: selectedPack ? `${selectedPack.count} pieces, ${selectedPack.badge}` : "Produit ELKO individuel",
        preferences: preference,
        offerType: selectedPack ? "pack-elko" : "produit-elko",
        source: "hawana.ma/elko-packs",
      },
      items,
      payment: "cash_on_delivery",
      subtotal: activeSubtotal,
      deliveryFee,
      total: activeTotal,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("hawana-last-order", JSON.stringify(order));
    queueOrder(order);
    const sheetUrl = import.meta.env.VITE_ORDERS_SHEET_URL;
    if (sheetUrl) sendOrder(sheetUrl, order);
    setOrderId(id);
  };

  return <div className="elko-page">
    <header className="elko-nav">
      <a href="/" aria-label="HAWANA"><img src="/assets/brand/hawana-wordmark.png" alt="HAWANA" /></a>
      <a className="elko-nav-link" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsappLogo size={20} weight="fill" />WhatsApp</a>
    </header>
    <main>
      <section className="elko-hero">
        <div className="elko-hero-copy">
          <img src="/assets/brand/elko-logo-transparent.png" alt="ELKO" />
          <p className="elko-eyebrow">Offres speciales HAWANA</p>
          <h1>Packs ELKO 100% coton pour commander plus simple.</h1>
          <p>Choisissez un pack pret a vendre en pub, laissez vos tailles et couleurs, puis commandez. Livraison partout au Maroc: 35 DH.</p>
          <div className="elko-hero-actions">
            <a href="#packs" className="elko-button primary">Voir les packs<ArrowRight size={18} /></a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="elko-button secondary"><WhatsappLogo size={18} weight="fill" />Commander WhatsApp</a>
          </div>
        </div>
        <div className="elko-hero-media">
          {preparedPacks[2].itemsResolved.slice(0, 5).map((item) => <img key={`${item.product.id}-${item.size}`} src={item.image ?? ""} alt={item.product.name.fr} />)}
          <span>Jusqu'a -30%</span>
        </div>
      </section>

      <section className="elko-proof" aria-label="Avantages">
        <div><Check size={20} /><span>Paiement a la livraison</span></div>
        <div><ShieldCheck size={20} /><span>Produits coton ELKO</span></div>
        <div><Phone size={20} /><span>Confirmation par telephone</span></div>
      </section>

      <section className="elko-packs" id="packs">
        <div className="elko-section-head">
          <p className="elko-eyebrow">Selection pub</p>
          <h2>8 packs prets a lancer</h2>
          <p>Les prix sont calcules depuis les prix originaux ELKO, pas depuis le prix deja remise.</p>
        </div>
        <div className="elko-pack-grid">
          {preparedPacks.map((pack) => <article className={pack.id === "elko-couple" ? "elko-pack-card featured" : "elko-pack-card"} key={pack.id}>
            <div className="elko-pack-media">
              {pack.itemsResolved.slice(0, 4).map((item, index) => <img key={`${pack.id}-${index}`} src={item.image ?? ""} alt={item.product.name.fr} />)}
            </div>
            <div className="elko-pack-body">
              <div className="elko-pack-top"><span>{pack.audience}</span><strong>{pack.badge}</strong></div>
              <h3>{pack.title}</h3>
              <p>{pack.hook}</p>
              <ul>
                {pack.itemsResolved.slice(0, 5).map((item, index) => <li key={`${pack.id}-line-${index}`}>{item.product.name.fr}</li>)}
                {pack.itemsResolved.length > 5 && <li>+ {pack.itemsResolved.length - 5} autres pieces</li>}
              </ul>
              <div className="elko-price">
                <span><s>{formatPrice(pack.originalTotal)} DH</s> pack</span>
                <strong>{formatPrice(pack.subtotal)} DH</strong>
                <small>+ 35 DH livraison = {formatPrice(pack.total)} DH</small>
              </div>
              <button className="elko-button primary full" onClick={() => { setSelectedPack(pack); setSelectedProduct(null); setOrderId(""); }}>Commander ce pack</button>
            </div>
          </article>)}
        </div>
      </section>

      <section className="elko-products" id="produits">
        <div className="elko-section-head">
          <p className="elko-eyebrow">Produits a l'unite</p>
          <h2>Chaque produit ELKO individuellement</h2>
          <p>Pour les clients qui arrivent depuis la pub et veulent commander une seule piece avant de prendre un pack.</p>
        </div>
        <div className="elko-product-grid">
          {preparedProducts.map((item) => <article className="elko-product-card" key={item.id}>
            <div className="elko-product-media">
              <img src={item.image ?? ""} alt={item.title} />
              <span>{item.audience}</span>
            </div>
            <div className="elko-product-body">
              <h3>{item.title}</h3>
              <p>{item.hook}</p>
              <div className="elko-meta">
                <span>{item.color}</span>
                <span>{item.size}</span>
              </div>
              <div className="elko-price compact">
                <span>{item.originalTotal > item.subtotal && <s>{formatPrice(item.originalTotal)} DH</s>}</span>
                <strong>{formatPrice(item.subtotal)} DH</strong>
                <small>+ 35 DH livraison = {formatPrice(item.total)} DH</small>
              </div>
              <button className="elko-button secondary full" onClick={() => { setSelectedProduct(item); setSelectedPack(null); setOrderId(""); }}>Commander</button>
            </div>
          </article>)}
        </div>
      </section>
    </main>

    <a className="elko-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Commander sur WhatsApp"><WhatsappLogo size={34} weight="fill" /></a>

    {(selectedPack || selectedProduct) && <div className="elko-modal" role="presentation" onMouseDown={closeOrder}>
      <section className="elko-dialog" role="dialog" aria-modal="true" aria-labelledby="elko-order-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="elko-close" onClick={closeOrder} aria-label="Fermer"><X size={22} /></button>
        {orderId ? <div className="elko-success">
          <Check size={42} />
          <h2>Commande enregistree</h2>
          <strong>{orderId}</strong>
          <p>Notre equipe vous contacte pour confirmer les tailles, couleurs et livraison.</p>
        </div> : <>
          <div className="elko-dialog-summary">
            <span>{activeBadge}</span>
            <h2 id="elko-order-title">{activeTitle}</h2>
            <p>{formatPrice(activeSubtotal)} DH + 35 DH livraison = <b>{formatPrice(activeTotal)} DH</b></p>
          </div>
          <form className="elko-form" onSubmit={submitOfferOrder}>
            <label>Nom complet<input name="name" required autoComplete="name" /></label>
            <label>Telephone<input name="phone" required autoComplete="tel" inputMode="tel" /></label>
            <label>Ville<input name="city" required autoComplete="address-level2" /></label>
            <label>Adresse<textarea name="address" required rows={3} autoComplete="street-address" /></label>
            <label>Tailles souhaitees<input name="sizes" placeholder="Ex: Homme M, Femme S" /></label>
            <label>Couleurs preferees<input name="colors" placeholder="Ex: blanc, noir" /></label>
            <button className="elko-button primary full" type="submit">Confirmer la commande<ArrowRight size={18} /></button>
          </form>
        </>}
      </section>
    </div>}
  </div>;
}

export default ElkoPacksLanding;
