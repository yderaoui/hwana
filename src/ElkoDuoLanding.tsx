import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Phone, ShieldCheck, WhatsappLogo, X } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import catalogData from "./data/catalog.json";
import { Product } from "./data/catalog";
import "./elko-packs.css";

type OrderSelection = { colorId: string; size: string };
type ResolvedItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
  image: string | null;
  color: string;
  size: string;
  barcode?: string | null;
};
type PreparedDuo = {
  id: string;
  title: string;
  badge: string;
  originalTotal: number;
  rawSubtotal: number;
  subtotal: number;
  total: number;
  itemsResolved: ResolvedItem[];
};
type PreparedSingle = {
  id: string;
  title: string;
  hook: string;
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
const boxer = products.find((product) => product.id === "elko-boxer-long-leg");
const tee = products.find((product) => product.id === "elko-100-cotton-crew-neck-short-sleeve");
const duoProducts = [boxer, tee].filter((product): product is Product => Boolean(product));

const pendingOrdersKey = "hawana-pending-orders";
const whatsappUrl = "https://api.whatsapp.com/send?phone=212689765468&text=Hawana.ma%20-%20Duo%20ELKO";
const includedDeliveryFee = 35;
const sheetDeliveryFee = 0;
const duoDiscount = 0.35;

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
const formatPrice = (value: number) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value);

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const availableSizes = (product: Product, colorId: string) => {
  const variantSizes = uniqueValues(product.variants?.filter((variant) => variant.colorId === colorId && variant.stock > 0).map((variant) => variant.size) ?? []);
  return variantSizes.length ? variantSizes : product.sizes;
};

const availableColors = (product: Product) => {
  const colors = product.colors.filter((color) => availableSizes(product, color.id).length > 0);
  return colors.length ? colors : product.colors;
};

const preferredDisplayChoice = (product: Product) => {
  const blackColor = product.colors.find((color) => {
    const label = `${color.id} ${color.label.fr} ${color.label.en}`.toLowerCase();
    return label.includes("noir") || label.includes("black");
  });
  const variant = blackColor
    ? product.variants?.find((item) => item.colorId === blackColor.id && item.stock > 0)
    : product.variants?.find((item) => item.stock > 0);
  const color = blackColor ?? product.colors.find((item) => item.id === variant?.colorId) ?? product.colors[0];
  return {
    color,
    size: variant?.size ?? availableSizes(product, color?.id ?? "")[0] ?? product.sizes[0] ?? "A confirmer",
    barcode: variant?.barcode,
  };
};

const defaultSelectionForProduct = (product: Product): OrderSelection => {
  const choice = preferredDisplayChoice(product);
  return { colorId: choice.color?.id ?? product.colors[0]?.id ?? "", size: choice.size };
};

const selectedVariant = (product: Product, selection: OrderSelection) =>
  product.variants?.find((variant) => variant.colorId === selection.colorId && variant.size === selection.size && variant.stock > 0)
  ?? product.variants?.find((variant) => variant.colorId === selection.colorId && variant.stock > 0)
  ?? product.variants?.find((variant) => variant.stock > 0);

const prepareDuo = (): PreparedDuo => {
  const itemsResolved = duoProducts.map((product) => {
    const choice = preferredDisplayChoice(product);
    return {
      product,
      quantity: 1,
      unitPrice: 0, // filled in below once rawSubtotal/subtotal are known
      image: choice.color?.image ?? product.colors[0]?.image ?? null,
      color: choice.color?.label.fr ?? "A confirmer",
      size: choice.size,
      barcode: choice.barcode,
    };
  });
  const rawOriginalTotal = duoProducts.reduce((sum, product) => sum + (product.regularPrice ?? product.price ?? 0), 0);
  const rawDiscounted = duoProducts.reduce((sum, product) => sum + Math.round((product.regularPrice ?? product.price ?? 0) * (1 - duoDiscount)), 0);
  const rawSubtotal = rawDiscounted;
  const originalTotal = roundCommercePrice(rawOriginalTotal + includedDeliveryFee);
  const subtotal = roundCommercePrice(rawSubtotal + includedDeliveryFee);
  let running = 0;
  const priced = itemsResolved.map((item, index) => {
    if (index === itemsResolved.length - 1) return { ...item, unitPrice: subtotal - running };
    const share = Math.round((item.product.regularPrice ?? item.product.price ?? 0) / rawOriginalTotal * subtotal / 5) * 5;
    running += share;
    return { ...item, unitPrice: share };
  });
  return {
    id: "duo-elko-boxer-tshirt",
    title: "Duo ELKO Boxer + T-shirt",
    badge: `-${Math.round((1 - subtotal / originalTotal) * 100)}%`,
    originalTotal,
    rawSubtotal,
    subtotal,
    total: subtotal,
    itemsResolved: priced,
  };
};

const prepareSingle = (product: Product): PreparedSingle => {
  const choice = preferredDisplayChoice(product);
  const rawSubtotal = Math.round(product.price ?? product.regularPrice ?? 0);
  const subtotal = roundCommercePrice(rawSubtotal + includedDeliveryFee);
  const originalTotal = roundCommercePrice((product.regularPrice ?? rawSubtotal) + includedDeliveryFee);
  return {
    id: `single-${product.id}`,
    title: product.name.fr,
    hook: product.short.fr || product.description.fr || "Produit ELKO disponible chez HAWANA.",
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

const itemKeyFor = (index: number) => `duo-item-${index}`;

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

function ElkoDuoLanding() {
  const pageRef = useRef<HTMLDivElement>(null);
  const duo = useMemo(() => prepareDuo(), []);
  const singles = useMemo(() => duoProducts.map(prepareSingle), []);
  const [mode, setMode] = useState<"duo" | string | null>(null);
  const [selections, setSelections] = useState<Record<string, OrderSelection>>({});
  const [orderId, setOrderId] = useState("");

  const activeSingle = mode && mode !== "duo" ? singles.find((item) => item.id === mode) ?? null : null;
  const activeTitle = mode === "duo" ? duo.title : activeSingle?.title ?? "";
  const activeBadge = mode === "duo" ? duo.badge : "A l'unite";
  const activeSubtotal = mode === "duo" ? duo.subtotal : activeSingle?.subtotal ?? 0;
  const activeTotal = mode === "duo" ? duo.total : activeSingle?.total ?? 0;

  useEffect(() => {
    if (!duoProducts.length) return;
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
          { y: 0, scale: 1, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 88%" }, delay: (index % 4) * 0.035 },
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

  const closeOrder = () => setMode(null);

  const openDuo = () => {
    setMode("duo");
    setOrderId("");
    setSelections(Object.fromEntries(duo.itemsResolved.map((item, index) => [itemKeyFor(index), defaultSelectionForProduct(item.product)])));
  };

  const openSingle = (single: PreparedSingle) => {
    setMode(single.id);
    setOrderId("");
    setSelections({ [single.id]: defaultSelectionForProduct(single.product) });
  };

  const updateSelection = (itemKey: string, product: Product, next: Partial<OrderSelection>) => {
    setSelections((current) => {
      const previous = current[itemKey] ?? defaultSelectionForProduct(product);
      const colorId = next.colorId ?? previous.colorId;
      const sizes = availableSizes(product, colorId);
      const size = next.size && sizes.includes(next.size) ? next.size : sizes.includes(previous.size) ? previous.size : sizes[0] ?? previous.size;
      return { ...current, [itemKey]: { colorId, size } };
    });
  };

  const submitOfferOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mode) return;
    const form = new FormData(event.currentTarget);
    const customer = Object.fromEntries(form) as Record<string, string>;
    const id = `HW-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const items = mode === "duo"
      ? duo.itemsResolved.map((item, index) => {
        const selection = selections[itemKeyFor(index)] ?? defaultSelectionForProduct(item.product);
        const color = item.product.colors.find((entry) => entry.id === selection.colorId) ?? item.product.colors[0];
        const variant = selectedVariant(item.product, selection);
        return {
          name: `${duo.title} - ${item.product.name.fr}`,
          color: color?.label.fr ?? item.color,
          size: selection.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
          image: color?.image ? new URL(color.image, window.location.origin).toString() : "",
          barcode: variant?.barcode ?? item.barcode,
        };
      })
      : activeSingle ? (() => {
        const selection = selections[activeSingle.id] ?? defaultSelectionForProduct(activeSingle.product);
        const color = activeSingle.product.colors.find((entry) => entry.id === selection.colorId) ?? activeSingle.product.colors[0];
        const variant = selectedVariant(activeSingle.product, selection);
        return [{
          name: `ELKO - ${activeSingle.product.name.fr}`,
          color: color?.label.fr ?? activeSingle.color,
          size: selection.size,
          quantity: 1,
          unitPrice: activeSingle.subtotal,
          lineTotal: activeSingle.subtotal,
          image: color?.image ? new URL(color.image, window.location.origin).toString() : "",
          barcode: variant?.barcode ?? activeSingle.barcode,
        }];
      })() : [];
    const preference = items.map((item) => `${item.name}: ${item.color} / ${item.size}`).join(" | ");
    const order: OrderPayload = {
      id,
      customer: {
        ...customer,
        pack: activeTitle,
        packDetails: mode === "duo" ? "2 pieces, duo ELKO" : "Produit ELKO individuel",
        preferences: preference,
        offerType: mode === "duo" ? "duo-elko" : "produit-elko",
        source: "hawana.ma/elko-duo",
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

  if (!duoProducts.length) return null;

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
          <h1>Le duo boxer + t-shirt ELKO.</h1>
          <p>Un boxer long leg et un t-shirt 100% coton ELKO, a commander ensemble ou separement, avec livraison gratuite partout au Maroc.</p>
          <div className="elko-hero-actions">
            <a href="#duo" className="elko-button primary">Voir le duo<ArrowRight size={18} /></a>
            <a href="#produits" className="elko-button ghost">Produits individuels<ArrowRight size={18} /></a>
          </div>
        </div>
        <div className="elko-hero-media">
          {duo.itemsResolved.map((item) => <img key={item.product.id} src={item.image ?? ""} alt={item.product.name.fr} />)}
          <span>Livraison gratuite</span>
        </div>
      </section>

      <section className="elko-proof" aria-label="Avantages">
        <div><Check size={20} /><span>Paiement a la livraison</span></div>
        <div><ShieldCheck size={20} /><span>Produits coton ELKO</span></div>
        <div><Phone size={20} /><span>Confirmation par telephone</span></div>
      </section>

      <section className="elko-packs" id="duo">
        <div className="elko-section-head">
          <p className="elko-eyebrow">Offre duo</p>
          <h2>Le boxer et le t-shirt, ensemble</h2>
          <p>Choisissez la couleur et la taille de chaque piece, on prepare le reste.</p>
        </div>
        <div className="elko-pack-grid">
          <article className="elko-pack-card featured" key={duo.id}>
            <div className="elko-pack-media">
              {duo.itemsResolved.map((item) => <img key={item.product.id} src={item.image ?? ""} alt={item.product.name.fr} />)}
            </div>
            <div className="elko-pack-body">
              <div className="elko-pack-top"><span>2 pieces</span><strong>{duo.badge}</strong></div>
              <h3>{duo.title}</h3>
              <p>Boxer long leg + T-shirt col rond, 100% coton ELKO.</p>
              <ul>
                {duo.itemsResolved.map((item) => <li key={item.product.id}>{item.product.name.fr}</li>)}
              </ul>
              <div className="elko-price">
                <span><s>{formatPrice(duo.originalTotal)} DH</s> prix habituel</span>
                <strong>{formatPrice(duo.subtotal)} DH</strong>
                <small>Livraison gratuite</small>
              </div>
              <button className="elko-button primary full" onClick={openDuo}>Voir et commander</button>
            </div>
          </article>
        </div>
      </section>

      <section className="elko-products" id="produits">
        <div className="elko-section-head">
          <p className="elko-eyebrow">Produits individuels</p>
          <h2>Chaque piece separement</h2>
          <p>Choisissez le modele, la couleur et la taille qui vous conviennent.</p>
        </div>
        <div className="elko-product-grid">
          {singles.map((item) => <article className="elko-product-card" key={item.id}>
            <div className="elko-product-media">
              <img src={item.image ?? ""} alt={item.title} />
              <span>Homme</span>
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
              <button className="elko-button secondary full" onClick={() => openSingle(item)}>Commander</button>
            </div>
          </article>)}
        </div>
      </section>
    </main>

    <a className="elko-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Commander sur WhatsApp"><WhatsappLogo size={34} weight="fill" /></a>

    {mode && <div className="elko-modal" role="presentation" onMouseDown={closeOrder}>
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
          {mode === "duo" && <div className="elko-order-items" aria-label="Produits inclus dans le duo">
            {duo.itemsResolved.map((item, index) => {
              const itemKey = itemKeyFor(index);
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
          {activeSingle && <div className="elko-order-items single" aria-label="Produit selectionne">
            <ItemChoice
              itemKey={activeSingle.id}
              product={activeSingle.product}
              selection={selections[activeSingle.id] ?? defaultSelectionForProduct(activeSingle.product)}
              onChange={updateSelection}
              price={activeSingle.subtotal}
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

export default ElkoDuoLanding;
