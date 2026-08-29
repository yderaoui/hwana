import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bag, Check, House, List, MagnifyingGlass, Minus, Package, Plus, SquaresFour, Storefront, Trash, X } from "@phosphor-icons/react";
import catalogData from "./data/catalog.json";
import campaignMedia from "./data/campaign-media.json";
import { Language, Product, ProductSubcategory, subcategoriesByCategory, subcategoryLabels, translations } from "./data/catalog";

const products = catalogData as Product[];
const packProducts = products.filter((product) => product.purchasable && product.imageStatus === "generated");
type Filter = "all" | "femme" | "homme" | "enfants" | "autres" | "ALSAMAH" | "ELKO";
type CartLine = { key: string; productId: string; colorId: string; size: string; quantity: number; unitPrice: number; packId?: string };

const pageCopy = {
  fr: {
    menu: "Menu", searchProducts: "Rechercher un produit", heroA: "Tout part.", heroB: "L’allure reste.", heroLead: "Les essentiels ALSAMAH dans leurs vraies coupes et couleurs, réunis par HAWANA.",
    departments: "Entrez par univers", categoriesLead: "Femme, homme, enfants et collants. Trouvez directement la pièce qui vous ressemble.", house: "La maison HAWANA", houseLead: "Deux signatures. Une même vision de l’essentiel.", catalogPending: "Bientôt chez HAWANA",
    chapterTitle: "La pièce juste. Dans la couleur juste.", chapterBody: "Explorez les silhouettes ALSAMAH, puis choisissez la couleur qui vous ressemble.", colorTitle: "Une coupe. Plusieurs expressions.", colorLead: "Du bleu marine au noir, découvrez chaque pièce dans ses couleurs.",
    buildPack: "Composer un pack", packLead: "Réunissez vos essentiels et profitez du prix pack.", shopTitle: "La sélection HAWANA", shopLead: "Choisissez votre pièce, sa couleur et sa taille, puis commandez directement.", worn: "Porté", product: "Produit", cod: "Paiement à la livraison", previous: "Précédent", next: "Suivant", collection: "Collection ALSAMAH", direct: "HAWANA",
  },
  en: {
    menu: "Menu", searchProducts: "Search products", heroA: "Everything goes.", heroB: "Style stays.", heroLead: "ALSAMAH essentials in their real cuts and colors, brought together by HAWANA.",
    departments: "Enter by department", categoriesLead: "Women, men, kids and hosiery. Go straight to the piece that feels right.", house: "The HAWANA house", houseLead: "Two signatures. One vision of the essential.", catalogPending: "Coming soon to HAWANA",
    chapterTitle: "The right piece. In the right color.", chapterBody: "Explore ALSAMAH silhouettes, then choose the color that feels like you.", colorTitle: "One cut. Many expressions.", colorLead: "From navy to black, discover every piece in its available colors.",
    buildPack: "Build a pack", packLead: "Bring your essentials together and unlock the pack price.", shopTitle: "The HAWANA selection", shopLead: "Choose your piece, color and size, then order directly.", worn: "Worn", product: "Product", cod: "Cash on delivery", previous: "Previous", next: "Next", collection: "ALSAMAH collection", direct: "HAWANA",
  },
  ar: {
    menu: "القائمة", searchProducts: "ابحث عن منتج", heroA: "كل شيء يرحل.", heroB: "الأناقة تبقى.", heroLead: "مخزون ALSAMAH بقصاته الحقيقية وألوانه المتاحة، في بيع مباشر بتوقيع HAWANA.",
    departments: "تسوق حسب القسم", categoriesLead: "نساء ورجال وأطفال وجوارب. اختر مباشرة القطعة التي تناسبك.", house: "دار HAWANA", houseLead: "توقيعان. رؤية واحدة للأساسيات.", catalogPending: "قريباً لدى HAWANA",
    chapterTitle: "القطعة المناسبة. باللون المناسب.", chapterBody: "اكتشف إطلالات ALSAMAH ثم اختر اللون الذي يشبهك.", colorTitle: "قصة واحدة. تعبيرات متعددة.", colorLead: "من الأزرق الداكن إلى الأسود، اكتشف كل قطعة بألوانها.",
    buildPack: "كوّن باقتك", packLead: "اجمع قطعك الأساسية واستفد من سعر الباقة.", shopTitle: "تشكيلة HAWANA", shopLead: "اختر القطعة واللون والمقاس، ثم اطلبها مباشرة.", worn: "عند الارتداء", product: "المنتج", cod: "الدفع عند الاستلام", previous: "السابق", next: "التالي", collection: "تشكيلة ALSAMAH", direct: "HAWANA",
  },
} as const;

const formatPrice = (value: number, language: Language) => new Intl.NumberFormat(language === "ar" ? "ar-MA" : language === "en" ? "en-MA" : "fr-MA", { maximumFractionDigits: 0 }).format(value);

function ProductImage({ src, alt, pending, className = "", eager = false }: { src: string | null; alt: string; pending: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(eager);
  useEffect(() => { setFailed(false); setLoaded(eager); }, [eager, src]);
  if (!src || failed) return <div className={`image-placeholder ${className}`} role="img" aria-label={`${alt}. ${pending}`}><Package size={25} /><span>{pending}</span></div>;
  return <img className={`${className} product-image ${loaded ? "is-loaded" : "is-loading"}`} src={src} alt={alt} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" />;
}

function MotionMedia({ video, poster, alt, pending, className = "" }: { video: string | null; poster: string; alt: string; pending: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !video || reduceMotion) return;
    const loader = new IntersectionObserver(([entry]) => {
      setNearby(entry.isIntersecting && entry.intersectionRatio >= .4);
    }, { rootMargin: "180px 0px", threshold: [0, .4] });
    const player = new IntersectionObserver(([entry]) => {
      setActive(entry.isIntersecting && entry.intersectionRatio >= .6);
    }, { threshold: [0, .6, .9] });
    loader.observe(host);
    player.observe(host);
    return () => { loader.disconnect(); player.disconnect(); };
  }, [reduceMotion, video]);
  useEffect(() => { if (!nearby) setReady(false); }, [nearby]);
  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    const syncPlayback = () => {
      if (active && !document.hidden) void media.play().catch(() => undefined);
      else media.pause();
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [active, nearby]);
  return <div ref={hostRef} className={`motion-media ${className}`}>
    <ProductImage className={ready ? "motion-poster is-hidden" : "motion-poster"} src={poster} alt={alt} pending={pending} />
    {video && nearby && !reduceMotion && <video ref={videoRef} muted loop playsInline preload="metadata" src={video} aria-label={alt} onCanPlay={() => setReady(true)} />}
  </div>;
}

function HeroFilm({ video, mobileVideo, poster, alt, pending, onReady }: { video: string | null; mobileVideo?: string; poster: string; alt: string; pending: string; onReady: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [mobile] = useState(() => window.matchMedia("(max-width: 780px)").matches);
  const [revealVideo, setRevealVideo] = useState(() => !window.matchMedia("(max-width: 780px)").matches);
  const selectedVideo = mobile && mobileVideo ? mobileVideo : video;
  useEffect(() => {
    if (!mobile || reduceMotion) return;
    const reveal = () => setRevealVideo(true);
    const timer = window.setTimeout(reveal, 8000);
    window.addEventListener("pointerdown", reveal, { once: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reveal);
    };
  }, [mobile, reduceMotion]);
  useEffect(() => {
    const host = hostRef.current;
    const media = videoRef.current;
    if (!host || !media) return;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) void media.play().catch(() => undefined);
      else media.pause();
    }, { threshold: .08 });
    const syncVisibility = () => document.hidden || !visible ? media.pause() : void media.play().catch(() => undefined);
    observer.observe(host);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", syncVisibility); };
  }, []);
  return <div ref={hostRef} className={revealVideo ? "hero-media is-playing" : "hero-media"}>
    <ProductImage eager className="hero-poster" src={poster} alt={alt} pending={pending} />
    {selectedVideo && !reduceMotion && <video ref={videoRef} muted loop autoPlay playsInline preload="metadata" src={selectedVideo} aria-label={alt} onCanPlay={onReady} />}
    <div className="hero-shade" />
  </div>;
}

function ProductCard({ product, language, onOpen, onAdd }: { product: Product; language: Language; onOpen: (product: Product) => void; onAdd: (product: Product, color: string, size: string) => void }) {
  const [colorId, setColorId] = useState(product.colors[0]?.id ?? "default");
  const color = product.colors.find((item) => item.id === colorId) ?? product.colors[0];
  const t = translations[language];
  const discount = product.price !== null && product.regularPrice ? Math.round((1 - product.price / product.regularPrice) * 100) : null;
  return <article className="product-card">
    <button className="product-media" type="button" onClick={() => onOpen(product)} aria-label={`${t.catalog.details}: ${product.name[language]}`}>
      <ProductImage src={color?.image ?? null} alt={product.name[language]} pending={t.catalog.imagePending} />
      {color?.lifestyleImage && <ProductImage className="worn-preview" src={color.lifestyleImage} alt={`${product.name[language]}, ${pageCopy[language].worn}`} pending={t.catalog.imagePending} />}
      {discount !== null && discount > 0 && <span className="discount">−{discount}%</span>}
      <span className="media-arrow"><ArrowRight size={18} /></span>
    </button>
    <div className="product-copy">
      <div className="product-kicker"><span>{product.brand}</span><span>{product.categoryName || product.category}</span></div>
      <button className="product-title" type="button" onClick={() => onOpen(product)}>{product.name[language]}</button>
      <div className="product-bottom">
        {product.price !== null ? <div className="price-line"><strong>{formatPrice(product.price, language)} MAD</strong>{product.regularPrice !== null && <s>{formatPrice(product.regularPrice, language)} MAD</s>}</div> : <p className="price-pending">{t.catalog.pricePending}</p>}
        <button className="add-button" type="button" disabled={!product.purchasable || !color} onClick={() => color && onAdd(product, color.id, product.sizes[0] ?? "TU")} aria-label={t.catalog.add}><Plus size={18} /></button>
      </div>
      <div className="swatches">{product.colors.slice(0, 7).map((item) => <button type="button" key={item.id} className={item.id === colorId ? "swatch active" : "swatch"} style={{ "--swatch": item.hex } as CSSProperties} onClick={() => setColorId(item.id)} aria-label={item.label[language]} />)}{product.colors.length > 7 && <small>+{product.colors.length - 7}</small>}</div>
    </div>
  </article>;
}

function ProductDialog({ product, language, onClose, onAdd }: { product: Product; language: Language; onClose: () => void; onAdd: (product: Product, color: string, size: string) => void }) {
  const [colorId, setColorId] = useState(product.colors[0]?.id ?? "default");
  const [size, setSize] = useState(product.sizes[0] ?? "TU");
  const [view, setView] = useState<"product" | "worn">("product");
  const color = product.colors.find((item) => item.id === colorId) ?? product.colors[0];
  const t = translations[language]; const c = pageCopy[language];
  useEffect(() => setView("product"), [colorId]);
  const shownImage = view === "worn" && color?.lifestyleImage ? color.lifestyleImage : color?.image ?? null;
  return <div className="overlay" role="presentation" onMouseDown={onClose}><section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="close-button" type="button" onClick={onClose} aria-label={t.product.close}><X size={21} /></button>
    <div className="dialog-media"><ProductImage src={shownImage} alt={product.name[language]} pending={t.catalog.imagePending} />{color?.lifestyleImage && <div className="view-switch"><button className={view === "product" ? "active" : ""} onClick={() => setView("product")}>{c.product}</button><button className={view === "worn" ? "active" : ""} onClick={() => setView("worn")}>{c.worn}</button></div>}</div>
    <div className="dialog-copy"><span className="brand-name">{product.brand}</span><h2 id="product-title">{product.name[language]}</h2><p>{product.description[language] || product.short[language]}</p>
      {product.price !== null ? <div className="price-line large"><strong>{formatPrice(product.price, language)} MAD</strong>{product.regularPrice !== null && <s>{formatPrice(product.regularPrice, language)} MAD</s>}</div> : <p className="price-pending">{t.catalog.pricePending}</p>}
      {color && <div className="option-group"><span>{t.product.color}: <b>{color.label[language]}</b></span><div className="swatches large-swatches">{product.colors.map((item) => <button type="button" key={item.id} className={item.id === colorId ? "swatch active" : "swatch"} style={{ "--swatch": item.hex } as CSSProperties} onClick={() => setColorId(item.id)} aria-label={item.label[language]} />)}</div></div>}
      <div className="option-group"><span>{t.product.size}</span><div className="size-list">{product.sizes.map((item) => <button type="button" key={item} className={item === size ? "active" : ""} onClick={() => setSize(item)}>{item}</button>)}</div></div>
      <button className="button primary full" type="button" disabled={!product.purchasable || !color} onClick={() => { if (color) { onAdd(product, color.id, size); onClose(); } }}>{product.purchasable ? t.product.add : t.catalog.unavailable}<ArrowRight size={17} /></button>
    </div>
  </section></div>;
}

function App() {
  const pageRef = useRef<HTMLDivElement>(null); const colorRail = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("fr"); const [filter, setFilter] = useState<Filter>("all"); const [subFilter, setSubFilter] = useState<ProductSubcategory | "all">("all"); const [search, setSearch] = useState(""); const [visibleLimit, setVisibleLimit] = useState(12); const [activeProduct, setActiveProduct] = useState<Product | null>(null); const [cartOpen, setCartOpen] = useState(false); const [checkoutOpen, setCheckoutOpen] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => { try { return JSON.parse(localStorage.getItem("hawana-cart") ?? "[]") as CartLine[]; } catch { return []; } });
  const [packTarget, setPackTarget] = useState(3); const [packCounts, setPackCounts] = useState<Record<string, number>>({}); const [orderId, setOrderId] = useState("");
  const t = translations[language]; const c = pageCopy[language];

  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; }, [language]);
  useEffect(() => localStorage.setItem("hawana-cart", JSON.stringify(cart)), [cart]);
  useEffect(() => setVisibleLimit(12), [filter, subFilter, search, language]);
  useEffect(() => setSubFilter("all"), [filter]);
  useEffect(() => {
    const overlayOpen = Boolean(activeProduct || cartOpen || checkoutOpen || menuOpen);
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (checkoutOpen) { setCheckoutOpen(false); setOrderId(""); }
      else if (cartOpen) setCartOpen(false);
      else if (activeProduct) setActiveProduct(null);
      else if (menuOpen) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKeyDown); };
  }, [activeProduct, cartOpen, checkoutOpen, menuOpen]);
  useEffect(() => {
    if (!pageRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = pageRef.current;
    if (window.matchMedia("(max-width: 780px)").matches) {
      const animations: Animation[] = [];
      const animate = (element: Element, delay = 0, offset = 24) => animations.push(element.animate([
        { opacity: 0, transform: `translate3d(0, ${offset}px, 0)` },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ], { duration: 620, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" }));
      root.querySelectorAll(".hero-brandbar img").forEach((element, index) => animate(element, 130 + index * 70, 14));
      root.querySelectorAll(".hero-copy > *").forEach((element, index) => animate(element, 210 + index * 85, 22));
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      }), { rootMargin: "0px 0px -6%", threshold: .08 });
      root.querySelectorAll(".section-reveal, .house-brand, .house-product, .pack-stage, .pack-builder").forEach((element) => observer.observe(element));
      return () => { observer.disconnect(); animations.forEach((animation) => animation.cancel()); };
    }
    let cancelled = false;
    let context: { revert: () => void } | undefined;
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      context = gsap.context(() => {
        const heroTimeline = gsap.timeline();
        heroTimeline.from(".hero-media", { opacity: 0, scale: 1.04, duration: 1.35, ease: "power3.out" })
          .from(".hero-brandbar img", { opacity: 0, y: 18, duration: .7, stagger: .08, ease: "power3.out" }, "-=.8")
          .from(".hero-copy > *", { opacity: 0, y: 42, duration: .9, stagger: .08, ease: "power3.out" }, "-=.65");
        gsap.utils.toArray<HTMLElement>(".scale-reveal").forEach((element) => gsap.fromTo(element, { opacity: .25, scale: .88 }, { opacity: 1, scale: 1, ease: "none", scrollTrigger: { trigger: element, start: "top 92%", end: "center 60%", scrub: .65 } }));
        gsap.utils.toArray<HTMLElement>(".section-reveal").forEach((element) => gsap.from(element, { y: 60, opacity: 0, duration: .85, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 86%" } }));
        gsap.from(".department-accordion > button", { y: 90, opacity: 0, duration: .9, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: ".department-accordion", start: "top 82%" } });
        gsap.fromTo(".house-unified", { clipPath: "inset(9% 6% 9% 6%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: ".house-unified", start: "top 88%", end: "center 58%", scrub: .7 } });
        gsap.from(".house-brand, .house-product", { y: 70, opacity: 0, duration: 1, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: ".house-unified", start: "top 74%" } });
        gsap.from(".wear-panel", { y: 110, opacity: 0, duration: 1.05, stagger: .14, ease: "power3.out", scrollTrigger: { trigger: ".wear-stage", start: "top 80%" } });
        if (window.innerWidth > 980) ScrollTrigger.create({ trigger: ".campaign-section", start: "top top", end: "bottom bottom", pin: ".campaign-intro", pinSpacing: false });
      }, root);
    })();
    return () => { cancelled = true; context?.revert(); };
  }, [language]);
  const availableSubcategories = subcategoriesByCategory[filter] ?? [];
  const filteredProducts = useMemo(() => { const needle = search.trim().toLocaleLowerCase(language); const imageScore = (product: Product) => { const available = product.colors.filter((color) => Boolean(color.image)).length; if (!available) return 0; return available === product.colors.length ? 2 : 1; }; return products.filter((product) => { if (!product.purchasable || imageScore(product) === 0) return false; const matchesFilter = filter === "all" || filter === product.category || filter === product.brand; const matchesSub = subFilter === "all" || product.subcategory === subFilter; const haystack = `${product.name[language]} ${product.short[language]} ${product.brand} ${product.categoryName ?? ""}`.toLocaleLowerCase(language); return matchesFilter && matchesSub && (!needle || haystack.includes(needle)); }).sort((a, b) => imageScore(b) - imageScore(a)); }, [filter, subFilter, language, search]);
  useEffect(() => {
    if (!pageRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations = [...pageRef.current.querySelectorAll<HTMLElement>(".product-grid .product-card")].map((card, index) => card.animate([
      { opacity: 0, transform: "translate3d(0, 18px, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ], { duration: 520, delay: Math.min(index * 22, 180), easing: "cubic-bezier(.16,1,.3,1)" }));
    return () => animations.forEach((animation) => animation.cancel());
  }, [filteredProducts, visibleLimit]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0); const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0); const packCount = Object.values(packCounts).reduce((sum, count) => sum + count, 0); const packDiscount = packTarget === 3 ? .2 : packTarget === 5 ? .3 : .4; const packBase = packProducts.reduce((sum, product) => sum + (packCounts[product.id] ?? 0) * (product.price ?? 0), 0); const packTotal = packBase * (1 - packDiscount);
  const addToCart = (product: Product, colorId: string, size: string, unitPrice = product.price, packId?: string) => { if (!product.purchasable || unitPrice === null) return; const key = `${product.id}:${colorId}:${size}:${packId ?? "single"}`; setCart((current) => { const exists = current.find((line) => line.key === key); return exists ? current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { key, productId: product.id, colorId, size, quantity: 1, unitPrice, packId }]; }); setCartOpen(true); };
  const changeQuantity = (key: string, amount: number) => setCart((current) => current.map((line) => line.key === key ? { ...line, quantity: line.quantity + amount } : line).filter((line) => line.quantity > 0));
  const updatePack = (id: string, amount: number) => setPackCounts((current) => { const total = Object.values(current).reduce((sum, count) => sum + count, 0); if (amount > 0 && total >= packTarget) return current; return { ...current, [id]: Math.max(0, (current[id] ?? 0) + amount) }; });
  const addPack = () => { if (packCount !== packTarget) return; const packId = `pack-${Date.now()}`; packProducts.forEach((product) => { for (let index = 0; index < (packCounts[product.id] ?? 0); index += 1) addToCart(product, product.colors[0].id, product.sizes[0] ?? "TU", Math.round((product.price ?? 0) * (1 - packDiscount)), packId); }); setPackCounts({}); setCartOpen(true); };
  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = `HW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const customer = Object.fromEntries(form) as Record<string, string>;
    const items = cart.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const color = product?.colors.find((item) => item.id === line.colorId);
      const image = color?.image ? new URL(color.image, window.location.origin).toString() : "";
      return { name: product?.name[language] ?? line.productId, color: color?.label[language] ?? line.colorId, size: line.size, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.unitPrice * line.quantity, image };
    });
    const order = { id, customer, items, payment: "cash_on_delivery", total: Math.round(cartTotal), createdAt: new Date().toISOString() };
    localStorage.setItem("hawana-last-order", JSON.stringify(order));
    const sheetUrl = import.meta.env.VITE_ORDERS_SHEET_URL;
    if (sheetUrl) void fetch(sheetUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(order) }).catch(() => undefined);
    setOrderId(id);
    setCart([]);
  };
  const goToShop = (nextFilter: Filter) => {
    setFilter(nextFilter);
    const useInstantNavigation = window.matchMedia("(max-width: 780px), (prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => document.getElementById("shop")?.scrollIntoView({ behavior: useInstantNavigation ? "auto" : "smooth", block: "start" }));
  };

  const media = campaignMedia as { heroVideo: string | null; cinematicHeroVideo?: string | null; runwayHeroVideo?: string | null; houseVideo?: string | null; packVideo?: string | null; bodyVideo?: string | null; fitVideo?: string | null; kidsVideo?: string | null; hosieryVideo?: string | null };
  const categories: { filter: Filter; label: string; image: string; video: string | null }[] = [{ filter: "femme", label: t.catalog.women, image: "/assets/official/body-top-bretelles.jpg", video: media.bodyVideo ?? null }, { filter: "homme", label: t.catalog.men, image: "/assets/lifestyle/round-neck-navy-worn.webp", video: media.fitVideo ?? media.heroVideo }, { filter: "enfants", label: t.catalog.kids, image: "/assets/official/leen-girls-legging.jpg", video: null }, { filter: "autres", label: language === "ar" ? "جوارب" : language === "en" ? "Hosiery" : "Collants", image: "/assets/official/fashion-large-fishnet-80-den-pantyhose.jpg", video: media.hosieryVideo ?? null }];
  const campaignStories = [{ image: "/assets/lifestyle/round-neck-navy-worn.webp", video: media.heroVideo, title: language === "ar" ? "قميص رجالي بياقة دائرية" : language === "en" ? "Men’s round-neck top" : "Haut homme col rond", detail: language === "ar" ? "أزرق داكن" : language === "en" ? "Navy" : "Bleu marine" }, { image: "/assets/lifestyle/body-offwhite-worn.webp", video: media.bodyVideo ?? null, title: language === "ar" ? "بودي بأكمام قصيرة" : language === "en" ? "Short-sleeve body" : "Body manches courtes", detail: language === "ar" ? "أبيض مائل للسكري" : language === "en" ? "Off-white" : "Blanc cassé" }, { image: "/assets/lifestyle/v-neck-gray-worn.webp", video: media.fitVideo ?? null, title: language === "ar" ? "قميص بياقة V" : language === "en" ? "V-neck top" : "Haut col V", detail: language === "ar" ? "رمادي" : language === "en" ? "Grey" : "Gris" }];
  const colorItems = packProducts.flatMap((product) => product.colors.map((color) => ({ product, color }))).filter((item) => item.color.image).slice(0, 16);
  const heroVideo = media.runwayHeroVideo ?? media.cinematicHeroVideo ?? media.heroVideo;
  const wearTitle = language === "ar" ? "لكل عمر. لكل إطلالة." : language === "en" ? "Every age. Every look." : "Chaque âge. Chaque allure.";
  const wearLead = language === "ar" ? "أساسيات ناعمة للأطفال وجوارب تعبر عن أسلوبك." : language === "en" ? "Soft kids essentials and hosiery that expresses your style." : "Des essentiels doux pour les enfants et des collants qui affirment votre style.";

  return <div ref={pageRef} className="site-shell">
    <header className="site-header"><a className="hawana-nav-logo" href="#top" aria-label="HAWANA"><img src="/assets/brand/hawana-wordmark.png" alt="HAWANA" /></a><nav><a href="#departments">{c.departments}</a><a href="#packs">{t.nav.packs}</a><a href="#shop">{t.nav.shop}</a></nav><div className="header-actions"><div className="language-switch">{(["fr", "ar", "en"] as Language[]).map((item) => <button className={language === item ? "active" : ""} onClick={() => setLanguage(item)} key={item}>{item.toUpperCase()}</button>)}</div><button className="cart-trigger" onClick={() => setCartOpen(true)} aria-label={t.cart.title}><Bag size={20} /><span>{cartCount}</span></button><button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label={c.menu}><List size={22} /></button></div></header>
    {menuOpen && <div className="menu-overlay"><img src="/assets/brand/hawana-lockup.png" alt="HAWANA" /><button className="close-button" onClick={() => setMenuOpen(false)}><X size={25} /></button><nav>{[["#departments", c.departments], ["#brands", t.nav.brands], ["#packs", t.nav.packs], ["#shop", t.nav.shop]].map(([href, label]) => <a href={href} onClick={() => setMenuOpen(false)} key={href}>{label}</a>)}</nav><div className="mobile-language" aria-label="Language">{(["fr", "ar", "en"] as Language[]).map((item) => <button className={language === item ? "active" : ""} onClick={() => { setLanguage(item); setMenuOpen(false); }} key={item}>{item.toUpperCase()}</button>)}</div></div>}
    <main id="top">
      <section className="hero-section"><HeroFilm video={heroVideo} mobileVideo="/assets/video/hawana-runway-hero-v2-mobile.mp4" poster="/assets/storyboards/hero-runway-v2.webp" alt="HAWANA campaign with ALSAMAH adults, child and hosiery" pending={t.catalog.imagePending} onReady={() => setHeroVideoReady(true)} /><div className={heroVideoReady ? "hero-brandbar video-ready" : "hero-brandbar"}><img src="/assets/brand/hawana-wordmark.png" alt="HAWANA" /><div><img className="hero-alsamah" src="/assets/brand/alsamah-lockup.png" alt="ALSAMAH" /><img className="hero-elko" src="/assets/brand/elko-logo-transparent.png" alt="ELKO" /></div></div><div className="hero-copy"><h1><span>{c.heroA}</span><span>{c.heroB}</span></h1><p>{c.heroLead}</p><div className="hero-actions"><a className="button primary" href="#shop">{t.hero.shop}<ArrowRight size={18} /></a><a className="text-link light" href="#packs">{t.hero.pack}<ArrowRight size={17} /></a></div></div></section>
      <div className="offer-marquee" aria-hidden="true"><div>{[...t.strip, ...t.strip].map((item, index) => <span key={`${item}-${index}`}>{item}<i /></span>)}</div></div>
      <section className="departments-section section-wrap" id="departments"><div className="section-heading section-reveal"><h2>{c.departments}</h2><p>{c.categoriesLead}</p></div><div className="department-accordion">{categories.map((item) => <button key={item.label} onClick={() => goToShop(item.filter)}><MotionMedia video={item.video} poster={item.image} alt={item.label} pending={t.catalog.imagePending} /><span className="department-title">{item.label}<ArrowRight size={23} /></span></button>)}</div></section>
      <section className="house-section" id="brands"><div className="section-wrap"><div className="house-copy section-reveal"><h2>{c.house}</h2><p>{c.houseLead}</p></div><div className="house-unified"><img className="house-watermark" src="/assets/brand/hawana-wordmark.png" alt="HAWANA" /><article className="house-brand house-alsamah"><img src="/assets/brand/alsamah-lockup.png" alt="ALSAMAH - your final touch" /><p>{t.brands.alsamah}</p><button className="text-link" onClick={() => goToShop("ALSAMAH")}>{t.brands.discover}<ArrowRight size={17} /></button></article><ProductImage className="house-product" src="/assets/products/body-black.webp" alt="ALSAMAH body" pending={t.catalog.imagePending} /><article className="house-brand house-elko"><img src="/assets/brand/elko-logo-transparent.png" alt="ELKO" /><p>{t.brands.elko}</p><span>{c.catalogPending}</span></article></div></div></section>
      <section className="campaign-section section-wrap"><div className="campaign-intro"><h2>{c.chapterTitle}</h2><p>{c.chapterBody}</p><button className="text-link" onClick={() => goToShop("all")}>{t.hero.shop}<ArrowRight size={17} /></button></div><div className="campaign-stories">{campaignStories.map((story, index) => <article className="campaign-card" style={{ "--stack-index": index } as CSSProperties} key={story.image}><MotionMedia className="scale-reveal" video={story.video} poster={story.image} alt={story.title} pending={t.catalog.imagePending} /><div><h3>{story.title}</h3><p>{story.detail}</p></div></article>)}</div></section>
      <section className="color-section"><div className="section-wrap color-heading section-reveal"><div><h2>{c.colorTitle}</h2><p>{c.colorLead}</p></div><div className="rail-controls"><button onClick={() => colorRail.current?.scrollBy({ left: -430, behavior: "smooth" })} aria-label={c.previous}><ArrowLeft size={22} /></button><button onClick={() => colorRail.current?.scrollBy({ left: 430, behavior: "smooth" })} aria-label={c.next}><ArrowRight size={22} /></button></div></div><div className="color-rail" ref={colorRail}>{colorItems.map(({ product, color }) => <button key={`${product.id}-${color.id}`} onClick={() => setActiveProduct(product)}><ProductImage src={color.image} alt={`${product.name[language]}, ${color.label[language]}`} pending={t.catalog.imagePending} /><span>{product.name[language]}</span><small>{color.label[language]}</small></button>)}</div></section>
      <section className="wear-story" aria-label={c.collection}><div className="section-wrap"><div className="wear-heading section-reveal"><h2>{wearTitle}</h2><p>{wearLead}</p></div><div className="wear-stage"><button className="wear-panel wear-kids" onClick={() => goToShop("enfants")}><ProductImage src="/assets/official/leen-girls-legging.jpg" alt={language === "ar" ? "طفلة ترتدي جوارب ALSAMAH" : language === "en" ? "Child wearing ALSAMAH leggings" : "Enfant portant un collant ALSAMAH"} pending={t.catalog.imagePending} /><span>{t.catalog.kids}<ArrowRight size={24} /></span></button><button className="wear-panel wear-hosiery" onClick={() => goToShop("autres")}><MotionMedia video={media.hosieryVideo ?? null} poster="/assets/generated/colors/collants-brillants-ete-dayana-bleu-marine.png" alt={language === "ar" ? "جوارب ALSAMAH زرقاء" : language === "en" ? "Navy ALSAMAH hosiery" : "Collants ALSAMAH bleu marine"} pending={t.catalog.imagePending} /><span>{language === "ar" ? "جوارب" : language === "en" ? "Hosiery" : "Collants"}<ArrowRight size={24} /></span></button></div></div></section>
      <section className="pack-section section-wrap" id="packs"><div className="pack-stage"><MotionMedia video={media.packVideo ?? null} poster="/assets/storyboards/pack-16x9.webp" alt={c.buildPack} pending={t.catalog.imagePending} /><div className="pack-film-overlay"><img className="pack-logo" src="/assets/brand/hawana-lockup.png" alt="HAWANA" /><span>{language === "ar" ? "اختياراتك. باقتك." : language === "en" ? "Your pieces. Your pack." : "Vos pièces. Votre pack."}</span></div></div><div className="pack-builder"><h2>{c.buildPack}</h2><p>{c.packLead}</p><div className="pack-levels">{[3, 5, 7].map((target) => <button className={packTarget === target ? "active" : ""} onClick={() => { setPackTarget(target); setPackCounts({}); }} key={target}><span>Pack {target}</span><strong>−{target === 3 ? 20 : target === 5 ? 30 : 40}%</strong></button>)}</div><div className="pack-products">{packProducts.map((product) => { const count = packCounts[product.id] ?? 0; return <div className="pack-row" key={product.id}><ProductImage src={product.colors[0].image} alt={product.name[language]} pending={t.catalog.imagePending} /><span>{product.name[language]}</span><div><button onClick={() => updatePack(product.id, -1)} disabled={!count}><Minus size={14} /></button><b>{count}</b><button onClick={() => updatePack(product.id, 1)} disabled={packCount >= packTarget}><Plus size={14} /></button></div></div>; })}</div><div className="pack-summary"><span>{packCount}/{packTarget}</span><strong>{formatPrice(packTotal, language)} MAD</strong></div><button className="button primary full" disabled={packCount !== packTarget} onClick={addPack}>{packCount === packTarget ? t.packs.create : `${t.packs.incomplete} ${packTarget - packCount}`}<Bag size={17} /></button></div></section>
      <section className="catalog-section section-wrap" id="shop"><div className="section-heading catalog-heading section-reveal"><h2>{c.shopTitle}</h2><p>{c.shopLead}</p></div><div className="catalog-tools"><div className="filters">{([["all", t.catalog.all], ["femme", t.catalog.women], ["homme", t.catalog.men], ["enfants", t.catalog.kids], ["autres", t.catalog.other], ["ALSAMAH", "ALSAMAH"]] as [Filter, string][]).map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div><label className="catalog-search"><MagnifyingGlass size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={c.searchProducts} /></label></div>{availableSubcategories.length > 0 && <div className="subfilters"><button className={subFilter === "all" ? "active" : ""} onClick={() => setSubFilter("all")}>{t.catalog.all}</button>{availableSubcategories.map((sub) => <button className={subFilter === sub ? "active" : ""} onClick={() => setSubFilter(sub)} key={sub}>{subcategoryLabels[sub][language]}</button>)}</div>}<p className="result-count">{filteredProducts.length} {t.catalog.count}</p>{filteredProducts.length ? <><div className="product-grid">{filteredProducts.slice(0, visibleLimit).map((product) => <ProductCard key={product.id} product={product} language={language} onOpen={setActiveProduct} onAdd={addToCart} />)}</div>{visibleLimit < filteredProducts.length && <div className="load-more"><button className="button secondary" onClick={() => setVisibleLimit((value) => value + 12)}>{t.catalog.loadMore}<Plus size={17} /></button></div>}</> : <div className="empty-state"><Package size={34} /><p>{t.catalog.empty}</p></div>}</section>
    </main>
    <nav className="mobile-dock" aria-label={language === "ar" ? "التنقل" : language === "en" ? "Mobile navigation" : "Navigation mobile"}><a href="#top"><House size={20} /><span>{language === "ar" ? "الرئيسية" : language === "en" ? "Home" : "Accueil"}</span></a><a href="#departments"><SquaresFour size={20} /><span>{language === "ar" ? "الأقسام" : language === "en" ? "Departments" : "Univers"}</span></a><a href="#shop"><Storefront size={20} /><span>{t.nav.shop}</span></a><button type="button" onClick={() => setCartOpen(true)}><Bag size={20} /><span>{t.cart.title}</span>{cartCount > 0 && <b>{cartCount}</b>}</button></nav>
    <footer><div className="footer-brand"><img src="/assets/brand/hawana-lockup.png" alt="HAWANA" /><p>{t.footer.line}</p></div><nav><a href="#departments">{c.departments}</a><a href="#packs">{t.nav.packs}</a><a href="#shop">{t.nav.shop}</a></nav><div className="footer-brands"><img src="/assets/brand/alsamah-lockup.png" alt="ALSAMAH" /><img src="/assets/brand/elko-logo-transparent.png" alt="ELKO" /></div><span>© {new Date().getFullYear()} HAWANA</span></footer>
    {activeProduct && <ProductDialog key={activeProduct.id} product={activeProduct} language={language} onClose={() => setActiveProduct(null)} onAdd={addToCart} />}
    {cartOpen && <div className="overlay cart-overlay" role="presentation" onMouseDown={() => setCartOpen(false)}><aside className="cart-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-head"><div><h2>{t.cart.title}</h2><span>{cartCount} {cartCount === 1 ? t.packs.item : t.packs.items}</span></div><button onClick={() => setCartOpen(false)}><X size={22} /></button></div>{!cart.length ? <div className="cart-empty"><Bag size={36} /><p>{t.cart.empty}</p><button className="button secondary full" onClick={() => setCartOpen(false)}>{t.cart.continue}</button></div> : <><div className="cart-lines">{cart.map((line) => { const product = products.find((item) => item.id === line.productId); if (!product) return null; const color = product.colors.find((item) => item.id === line.colorId) ?? product.colors[0]; return <article className="cart-line" key={line.key}><ProductImage src={color?.image ?? null} alt={product.name[language]} pending={t.catalog.imagePending} /><div className="cart-line-copy"><strong>{product.name[language]}</strong><span>{color?.label[language]} / {line.size}</span><div className="quantity"><button onClick={() => changeQuantity(line.key, -1)}><Minus size={13} /></button><b>{line.quantity}</b><button onClick={() => changeQuantity(line.key, 1)}><Plus size={13} /></button></div></div><div className="line-price"><strong>{formatPrice(line.unitPrice * line.quantity, language)} MAD</strong><button onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}><Trash size={17} /></button></div></article>; })}</div><div className="cart-totals"><div><span>{t.cart.subtotal}</span><strong>{formatPrice(cartTotal, language)} MAD</strong></div><p>{c.cod}</p></div><button className="button primary full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>{t.cart.checkout}<ArrowRight size={17} /></button></>}</aside></div>}
    {checkoutOpen && <div className="overlay" role="presentation" onMouseDown={() => { setCheckoutOpen(false); setOrderId(""); }}><section className="checkout-dialog" onMouseDown={(event) => event.stopPropagation()}><button className="close-button" onClick={() => { setCheckoutOpen(false); setOrderId(""); }}><X size={21} /></button>{orderId ? <div className="order-success"><Check size={34} /><h2>{t.checkout.success}</h2><strong>{orderId}</strong><p>{t.checkout.note}</p></div> : <div className="checkout-core"><h2>{t.checkout.title}</h2><p>{c.cod}</p><form onSubmit={submitOrder}><label>{t.checkout.name}<input name="name" required autoComplete="name" /></label><label>{t.checkout.phone}<input name="phone" required autoComplete="tel" inputMode="tel" /></label><label>{t.checkout.city}<input name="city" required autoComplete="address-level2" /></label><label>{t.checkout.address}<textarea name="address" required autoComplete="street-address" rows={3} /></label><div className="payment-choice"><Check size={18} />{c.cod}</div><div className="checkout-total"><span>{t.cart.subtotal}</span><strong>{formatPrice(cartTotal, language)} MAD</strong></div><button className="button primary full" type="submit">{t.checkout.submit}<ArrowRight size={17} /></button></form></div>}</section></div>}
  </div>;
}

export default App;
