import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Phone, ShieldCheck, WhatsappLogo, X } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  rawSubtotal: number;
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
  rawSubtotal: number;
  subtotal: number;
  total: number;
  image: string | null;
  color: string;
  size: string;
  barcode?: string | null;
};
type OrderSelection = {
  colorId: string;
  size: string;
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
const pendingOrdersKey = "hawana-pending-orders";
const whatsappUrl = "https://api.whatsapp.com/send?phone=212689765468&text=Hawana.ma%20-%20Pack%20ELKO";
const includedDeliveryFee = 35;
const sheetDeliveryFee = 0;

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

const roundCommercePrice = (value: number) => Math.round(value / 5) * 5;
const discountForCount = (count: number) => count === 3 ? 0.2 : count === 5 ? 0.25 : 0.3;
const formatPrice = (value: number) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value);
const productById = new Map(products.map((product) => [product.id, product]));

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const availableSizes = (product: Product, colorId: string) => {
  const variantSizes = uniqueValues(product.variants?.filter((variant) => variant.colorId === colorId && variant.stock > 0).map((variant) => variant.size) ?? []);
  return variantSizes.length ? variantSizes : product.sizes;
};

const availableColors = (product: Product) => {
  const colors = product.colors.filter((color) => availableSizes(product, color.id).length > 0);
  return colors.length ? colors : product.colors;
};

const firstAvailableChoice = (product: Product) => {
  const variant = product.variants?.find((item) => item.stock > 0);
  const color = product.colors.find((item) => item.id === variant?.colorId) ?? product.colors[0];
  return {
    color,
    size: variant?.size ?? product.sizes[0] ?? "A confirmer",
    barcode: variant?.barcode,
  };
};

const preferredDisplayChoice = (product: Product) => {
  const blackColor = product.colors.find((color) => {
    const label = `${color.id} ${color.label.fr} ${color.label.en}`.toLowerCase();
    return label.includes("noir") || label.includes("black");
  });
  const variant = blackColor
    ? product.variants?.find((item) => item.colorId === blackColor.id && item.stock > 0)
    : undefined;
  if (blackColor) {
    return {
      color: blackColor,
      size: variant?.size ?? availableSizes(product, blackColor.id)[0] ?? product.sizes[0] ?? "A confirmer",
      barcode: variant?.barcode,
    };
  }
  return firstAvailableChoice(product);
};

const defaultSelectionForProduct = (product: Product): OrderSelection => {
  const choice = preferredDisplayChoice(product);
  return {
    colorId: choice.color?.id ?? product.colors[0]?.id ?? "",
    size: choice.size,
  };
};

const selectedVariant = (product: Product, selection: OrderSelection) =>
  product.variants?.find((variant) => variant.colorId === selection.colorId && variant.size === selection.size && variant.stock > 0)
  ?? product.variants?.find((variant) => variant.colorId === selection.colorId && variant.stock > 0)
  ?? product.variants?.find((variant) => variant.stock > 0);

const packItemKey = (packId: string, index: number) => `${packId}-${index}`;

const preparePack = (pack: PackSpec): PreparedPack => {
  const expanded = pack.items.flatMap((item) => {
    const product = productById.get(item.productId);
    if (!product) return [];
    return Array.from({ length: item.quantity ?? 1 }, () => product);
  });
  const count = expanded.length;
  const discount = discountForCount(count);
  const itemsResolved = expanded.map((product) => {
    const choice = preferredDisplayChoice(product);
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

  const rawOriginalTotal = expanded.reduce((sum, product) => sum + (product.regularPrice ?? product.price ?? 0), 0);
  const rawSubtotal = itemsResolved.reduce((sum, item) => sum + item.unitPrice, 0);
  const originalTotal = roundCommercePrice(rawOriginalTotal + includedDeliveryFee);
  const subtotal = roundCommercePrice(rawSubtotal + includedDeliveryFee);
  return { ...pack, count, discount: Math.round(discount * 100), originalTotal, rawSubtotal, subtotal, total: subtotal, itemsResolved };
};

const prepareProduct = (product: Product): PreparedProduct => {
  const choice = preferredDisplayChoice(product);
  const variantPrice = choice.barcode ? product.variants?.find((variant) => variant.barcode === choice.barcode)?.price : null;
  const variantRegularPrice = choice.barcode ? product.variants?.find((variant) => variant.barcode === choice.barcode)?.regularPrice : null;
  const rawSubtotal = Math.round(variantPrice ?? product.price ?? product.regularPrice ?? 0);
  const subtotal = roundCommercePrice(rawSubtotal + includedDeliveryFee);
  const originalTotal = roundCommercePrice((variantRegularPrice ?? product.regularPrice ?? rawSubtotal) + includedDeliveryFee);
  return {
    id: `single-${product.id}`,
    title: product.name.fr,
    audience: product.category === "homme" ? "Homme" : product.category === "femme" ? "Femme" : "ELKO",
    hook: product.short.fr || product.description.fr || "Produit ELKO disponible chez HAWANA.",
    badge: "A l'unite",
    product,
    originalTotal,
    rawSubtotal,
    subtotal,
    total: subtotal,
    image: choice.color?.image ?? product.colors[0]?.image ?? null,
    color: choice.color?.label.fr ?? "A confirmer",
    size: choice.size,
    barcode: choice.barcode,
  };
};

function ItemChoice({ itemKey, product, selection, onChange, price }: { itemKey: string; product: Product; selection: OrderSelection; onChange: (itemKey: string, product: Product, next: Partial<OrderSelection>) => void; price?: number }) {
  const colors = availableColors(product);
  const color = product.colors.find((entry) => entry.id === selection.colorId) ?? colors[0] ?? product.colors[0];
  const sizes = color ? availableSizes(product, color.id) : product.sizes;
  const image = color?.image ?? product.colors[0]?.image ?? "";

  return <article className="elko-choice-card">
    <img src={image} alt={product.name.fr} />
    <div className="elko-choice-content">
      <div className="elko-choice-head">
        <strong>{product.name.fr}</strong>
        {price !== undefined && <span>{formatPrice(price)} DH</span>}
      </div>
      <div className="elko-choice-colors" aria-label={`Couleurs pour ${product.name.fr}`}>
        {colors.map((option) => <button
          type="button"
          className={option.id === color?.id ? "active" : ""}
          onClick={() => onChange(itemKey, product, { colorId: option.id })}
          key={`${itemKey}-${option.id}`}
          aria-label={option.label.fr}
          title={option.label.fr}
        >
          {option.image ? <img src={option.image} alt="" /> : <span style={{ background: option.hex }} />}
        </button>)}
      </div>
      <label className="elko-choice-size">
        Taille
        <select value={selection.size} onChange={(event) => onChange(itemKey, product, { size: event.target.value })}>
          {sizes.map((size) => <option value={size} key={`${itemKey}-${size}`}>{size}</option>)}
        </select>
      </label>
      <small>{color?.label.fr ?? "Couleur"} disponible</small>
    </div>
  </article>;
}

function ElkoPacksLanding() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [selectedPack, setSelectedPack] = useState<PreparedPack | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PreparedProduct | null>(null);
  const [selections, setSelections] = useState<Record<string, OrderSelection>>({});
  const [orderId, setOrderId] = useState("");
  const preparedPacks = useMemo(() => packSpecs.map(preparePack), []);
  const preparedProducts = useMemo(() => elkoProducts.map(prepareProduct), []);
  const activeTitle = selectedPack?.title ?? selectedProduct?.title ?? "";
  const activeBadge = selectedPack?.badge ?? selectedProduct?.badge ?? "";
  const activeSubtotal = selectedPack?.subtotal ?? selectedProduct?.subtotal ?? 0;
  const activeTotal = selectedPack?.total ?? selectedProduct?.total ?? 0;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.fromTo(
        ".elko-hero-copy, .elko-hero-media",
        { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12 },
      );
      gsap.utils.toArray<HTMLElement>(".elko-pack-card, .elko-product-card").forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 28, scale: 0.985 },
          {
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 88%" },
            delay: (index % 4) * 0.035,
          },
        );
      });
      gsap.to(".elko-hero-media img", {
        yPercent: -8,
        ease: "none",
        scrollTrigger: { trigger: ".elko-hero", start: "top top", end: "bottom top", scrub: true },
      });
    }, pageRef);
    return () => context.revert();
  }, []);

  const closeOrder = () => {
    setSelectedPack(null);
    setSelectedProduct(null);
  };

  const openPack = (pack: PreparedPack) => {
    setSelectedPack(pack);
    setSelectedProduct(null);
    setOrderId("");
    setSelections(Object.fromEntries(pack.itemsResolved.map((item, index) => [packItemKey(pack.id, index), defaultSelectionForProduct(item.product)])));
  };

  const openProduct = (product: PreparedProduct) => {
    setSelectedProduct(product);
    setSelectedPack(null);
    setOrderId("");
    setSelections({ [product.id]: defaultSelectionForProduct(product.product) });
  };

  const updateSelection = (itemKey: string, product: Product, next: Partial<OrderSelection>) => {
    setSelections((current) => {
      const previous = current[itemKey] ?? defaultSelectionForProduct(product);
      const colorId = next.colorId ?? previous.colorId;
      const sizes = availableSizes(product, colorId);
      const size = next.size && sizes.includes(next.size)
        ? next.size
        : sizes.includes(previous.size)
          ? previous.size
          : sizes[0] ?? previous.size;
      return { ...current, [itemKey]: { colorId, size } };
    });
  };

  const pricedPackItems = (pack: PreparedPack) => {
    if (pack.rawSubtotal <= 0) return pack.itemsResolved;
    let runningTotal = 0;
    return pack.itemsResolved.map((item, index) => {
      if (index === pack.itemsResolved.length - 1) {
        return { ...item, unitPrice: pack.subtotal - runningTotal };
      }
      const unitPrice = Math.max(0, roundCommercePrice((item.unitPrice / pack.rawSubtotal) * pack.subtotal));
      runningTotal += unitPrice;
      return { ...item, unitPrice };
    });
  };

  const submitOfferOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPack && !selectedProduct) return;
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(form) as Record<string, string>;
    const id = `HW-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const items = selectedPack
      ? pricedPackItems(selectedPack).map((item, index) => {
        const selection = selections[packItemKey(selectedPack.id, index)] ?? defaultSelectionForProduct(item.product);
        const color = item.product.colors.find((entry) => entry.id === selection.colorId) ?? item.product.colors[0];
        const variant = selectedVariant(item.product, selection);
        return {
          name: `${selectedPack.title} - ${item.product.name.fr}`,
          color: color?.label.fr ?? item.color,
          size: selection.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
          image: color?.image ? new URL(color.image, window.location.origin).toString() : "",
          barcode: variant?.barcode ?? item.barcode,
        };
      })
      : selectedProduct ? (() => {
        const selection = selections[selectedProduct.id] ?? defaultSelectionForProduct(selectedProduct.product);
        const color = selectedProduct.product.colors.find((entry) => entry.id === selection.colorId) ?? selectedProduct.product.colors[0];
        const variant = selectedVariant(selectedProduct.product, selection);
        return [{
          name: `ELKO - ${selectedProduct.product.name.fr}`,
          color: color?.label.fr ?? selectedProduct.color,
          size: selection.size,
          quantity: 1,
          unitPrice: selectedProduct.subtotal,
          lineTotal: selectedProduct.subtotal,
          image: color?.image ? new URL(color.image, window.location.origin).toString() : "",
          barcode: variant?.barcode ?? selectedProduct.barcode,
        }];
      })() : [];
    const preference = items.map((item) => `${item.name}: ${item.color} / ${item.size}`).join(" | ");
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
      deliveryFee: sheetDeliveryFee,
      total: activeTotal,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("hawana-last-order", JSON.stringify(order));
    queueOrder(order);
    const sheetUrl = import.meta.env.VITE_ORDERS_SHEET_URL;
    if (sheetUrl) sendOrder(sheetUrl, order);
    setOrderId(id);
  };

  return <div className="elko-page" ref={pageRef}>
    <header className="elko-nav">
      <a href="/" aria-label="HAWANA"><img src="/assets/brand/hawana-wordmark.png" alt="HAWANA" /></a>
      <a className="elko-nav-link" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsappLogo size={20} weight="fill" />WhatsApp</a>
    </header>
    <main>
      <section className="elko-hero">
        <div className="elko-hero-copy">
          <img src="/assets/brand/elko-logo-transparent.png" alt="ELKO" />
          <p className="elko-eyebrow">HAWANA x ELKO</p>
          <h1>ELKO coton, pret a commander.</h1>
          <p>Packs publicitaires et produits ELKO a l'unite, avec prix final arrondi et livraison gratuite incluse partout au Maroc.</p>
          <div className="elko-hero-actions">
            <a href="#packs" className="elko-button primary">Voir les packs<ArrowRight size={18} /></a>
            <a href="#produits" className="elko-button ghost">Produits individuels<ArrowRight size={18} /></a>
          </div>
        </div>
        <div className="elko-hero-media">
          {preparedPacks[2].itemsResolved.slice(0, 5).map((item) => <img key={`${item.product.id}-${item.size}`} src={item.image ?? ""} alt={item.product.name.fr} />)}
          <span>Livraison gratuite</span>
        </div>
      </section>

      <section className="elko-proof" aria-label="Avantages">
        <div><Check size={20} /><span>Paiement a la livraison</span></div>
        <div><ShieldCheck size={20} /><span>Produits coton ELKO</span></div>
        <div><Phone size={20} /><span>Confirmation par telephone</span></div>
      </section>

      <section className="elko-packs" id="packs">
        <div className="elko-section-head">
          <p className="elko-eyebrow">Packs publicitaires</p>
          <h2>8 packs prets a lancer</h2>
          <p>Les prix affiches incluent la livraison et finissent toujours par 0 ou 5.</p>
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
                <span><s>{formatPrice(pack.originalTotal)} DH</s> prix normal livre</span>
                <strong>{formatPrice(pack.subtotal)} DH</strong>
                <small>Livraison gratuite</small>
              </div>
              <button className="elko-button primary full" onClick={() => openPack(pack)}>Voir et commander</button>
            </div>
          </article>)}
        </div>
      </section>

      <section className="elko-products" id="produits">
        <div className="elko-section-head">
          <p className="elko-eyebrow">Produits individuels</p>
          <h2>Chaque produit ELKO individuellement</h2>
          <p>Tous les produits ELKO restent commandables un par un avec livraison gratuite incluse.</p>
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
                <small>Livraison gratuite</small>
              </div>
              <button className="elko-button secondary full" onClick={() => openProduct(item)}>Commander</button>
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
            <p><b>{formatPrice(activeTotal)} DH</b> avec livraison gratuite</p>
          </div>
          {selectedPack && <div className="elko-order-items" aria-label="Produits inclus dans le pack">
            {pricedPackItems(selectedPack).map((item, index) => {
              const itemKey = packItemKey(selectedPack.id, index);
              return <ItemChoice
                itemKey={itemKey}
                product={item.product}
                selection={selections[itemKey] ?? defaultSelectionForProduct(item.product)}
                onChange={updateSelection}
                price={item.unitPrice}
                key={itemKey}
              />;
            })}
          </div>}
          {selectedProduct && <div className="elko-order-items single" aria-label="Produit selectionne">
            <ItemChoice
              itemKey={selectedProduct.id}
              product={selectedProduct.product}
              selection={selections[selectedProduct.id] ?? defaultSelectionForProduct(selectedProduct.product)}
              onChange={updateSelection}
              price={selectedProduct.subtotal}
            />
          </div>}
          <form className="elko-form" onSubmit={submitOfferOrder}>
            <label>Nom complet<input name="name" required autoComplete="name" /></label>
            <label>Telephone<input name="phone" required autoComplete="tel" inputMode="tel" /></label>
            <label>Ville<input name="city" required autoComplete="address-level2" /></label>
            <label>Adresse<textarea name="address" required rows={3} autoComplete="street-address" /></label>
            <button className="elko-button primary full" type="submit">Confirmer la commande<ArrowRight size={18} /></button>
          </form>
        </>}
      </section>
    </div>}
  </div>;
}

export default ElkoPacksLanding;
