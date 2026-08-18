export type Language = "fr" | "ar" | "en";
export type ProductCategory = "femme" | "homme" | "enfants" | "autres" | "non-classe";
export type ProductSubcategory = "soutien-gorge" | "culottes" | "corsets" | "bodies" | "collants" | "chaussettes" | "nuisettes" | "vetements" | "sous-vetements" | "hauts" | "fille" | "garcon";
export type LocalizedText = Record<Language, string>;

export const subcategoriesByCategory: Record<string, ProductSubcategory[]> = {
  femme: ["soutien-gorge", "culottes", "corsets", "bodies", "collants", "chaussettes", "nuisettes", "vetements"],
  homme: ["hauts", "sous-vetements", "corsets"],
  enfants: ["fille", "garcon", "chaussettes", "collants"],
};

export const subcategoryLabels: Record<ProductSubcategory, LocalizedText> = {
  "soutien-gorge": { fr: "Soutiens-gorge", ar: "حمالات صدر", en: "Bras" },
  culottes: { fr: "Culottes & Boxers", ar: "سراويل داخلية", en: "Briefs & Boxers" },
  corsets: { fr: "Corsets & Gainants", ar: "مشد", en: "Shapewear" },
  bodies: { fr: "Bodies & Caracos", ar: "بودي", en: "Bodysuits & Camis" },
  collants: { fr: "Collants", ar: "جوارب طويلة", en: "Tights" },
  chaussettes: { fr: "Chaussettes", ar: "شرابات", en: "Socks" },
  nuisettes: { fr: "Nuisettes", ar: "ملابس النوم", en: "Sleepwear" },
  vetements: { fr: "Vêtements", ar: "ملابس", en: "Clothing" },
  "sous-vetements": { fr: "Sous-vêtements", ar: "ملابس داخلية", en: "Underwear" },
  hauts: { fr: "Hauts", ar: "قمصان", en: "Tops" },
  fille: { fr: "Fille", ar: "بنات", en: "Girls" },
  garcon: { fr: "Garçon", ar: "أولاد", en: "Boys" },
};

export type ProductColor = {
  id: string;
  label: LocalizedText;
  hex: string;
  image: string | null;
  imageKind: "generated" | "source" | "missing";
  lifestyleImage?: string;
};

export type Product = {
  id: string;
  brand: string;
  category: ProductCategory;
  categoryName: string | null;
  subcategory: ProductSubcategory | null;
  name: LocalizedText;
  short: LocalizedText;
  description: LocalizedText;
  regularPrice: number | null;
  price: number | null;
  stock: number;
  sizes: string[];
  colors: ProductColor[];
  purchasable: boolean;
  imageStatus: "generated" | "source" | "missing";
  sourcePage: string | null;
  variantCount: number;
  missing: { price: boolean; category: boolean; image: boolean };
};

export const translations = {
  fr: {
    nav: { shop: "Boutique", packs: "Packs", brands: "Marques" },
    hero: { titleA: "Tout part.", titleB: "L’allure reste.", body: "Les essentiels ALSAMAH dans leurs vraies coupes et couleurs, réunis par HAWANA.", shop: "Voir les offres", pack: "Composer mon pack" },
    strip: ["Jusqu’à -40% sur les packs", "Séries limitées", "Livraison partout au Maroc"],
    catalog: { title: "La sélection HAWANA", body: "Choisissez votre pièce, sa couleur et sa taille, puis commandez directement.", all: "Tous", women: "Femme", men: "Homme", kids: "Enfants", other: "Autres", incomplete: "À compléter", add: "Ajouter", details: "Voir le produit", empty: "Aucun produit dans cette sélection.", count: "produits", loadMore: "Voir plus", imagePending: "Photo bientôt disponible", pricePending: "Bientôt disponible", unavailable: "Indisponible" },
    packs: { title: "Plus on groupe, plus on économise.", body: "Choisissez vos essentiels et profitez automatiquement du prix pack.", create: "Ajouter le pack au panier", selection: "Votre pack", incomplete: "Ajoutez encore", item: "article", items: "articles" },
    brands: { title: "Deux signatures. Une maison.", alsamah: "ALSAMAH accompagne chaque silhouette avec des essentiels pensés pour le quotidien.", elko: "ELKO rejoint prochainement la sélection HAWANA.", discover: "Découvrir ALSAMAH", soon: "Bientôt chez HAWANA" },
    cart: { title: "Votre panier", empty: "Votre panier attend sa première bonne affaire.", continue: "Continuer mes achats", subtotal: "Sous-total", delivery: "Livraison calculée à l'étape suivante", checkout: "Commander", remove: "Retirer", promo: "Code promo", apply: "Appliquer", invalid: "Code non reconnu", applied: "HAWANA10 appliqué" },
    product: { color: "Couleur", size: "Taille", stock: "disponible", add: "Ajouter au panier", close: "Fermer", generated: "Disponible dans cette couleur", source: "Photo du produit" },
    checkout: { title: "Finaliser la commande", name: "Nom complet", phone: "Téléphone", city: "Ville", address: "Adresse", submit: "Confirmer la commande", success: "Commande enregistrée", note: "Notre équipe vous contactera pour confirmer la livraison." },
    footer: { line: "Les essentiels HAWANA, au meilleur prix.", help: "Besoin d'aide ?", rights: "HAWANA. Tous droits réservés." },
  },
  ar: {
    nav: { shop: "المتجر", packs: "الباقات", brands: "العلامات" },
    hero: { titleA: "كل القطع ترحل.", titleB: "الأناقة تبقى.", body: "أساسيات ALSAMAH بقصاتها وألوانها الحقيقية، تجمعها HAWANA في مكان واحد.", shop: "شاهد العروض", pack: "كوّن باقتك" },
    strip: ["خصم يصل إلى 40% على الباقات", "كميات محدودة", "توصيل إلى جميع مدن المغرب"],
    catalog: { title: "تشكيلة HAWANA", body: "اختر القطعة واللون والمقاس، ثم اطلبها مباشرة.", all: "الكل", women: "نساء", men: "رجال", kids: "أطفال", other: "أخرى", incomplete: "بيانات ناقصة", add: "أضف", details: "شاهد المنتج", empty: "لا توجد منتجات في هذا الاختيار.", count: "منتج", loadMore: "عرض المزيد", imagePending: "الصورة متاحة قريباً", pricePending: "متاح قريباً", unavailable: "غير متاح" },
    packs: { title: "كلما جمعت أكثر، وفرت أكثر.", body: "اختر أساسياتك واستفد تلقائياً من سعر الباقة.", create: "أضف الباقة إلى السلة", selection: "باقتك", incomplete: "أضف", item: "قطعة", items: "قطع" },
    brands: { title: "توقيعان. دار واحدة.", alsamah: "ترافق ALSAMAH كل إطلالة بأساسيات مصممة للحياة اليومية.", elko: "تنضم ELKO قريباً إلى تشكيلة HAWANA.", discover: "اكتشف ALSAMAH", soon: "قريباً لدى HAWANA" },
    cart: { title: "سلة التسوق", empty: "سلتك بانتظار أول صفقة.", continue: "متابعة التسوق", subtotal: "المجموع", delivery: "يتم حساب التوصيل في الخطوة التالية", checkout: "إتمام الطلب", remove: "حذف", promo: "رمز الخصم", apply: "تطبيق", invalid: "الرمز غير صالح", applied: "تم تطبيق HAWANA10" },
    product: { color: "اللون", size: "المقاس", stock: "متوفر", add: "أضف إلى السلة", close: "إغلاق", generated: "متوفر بهذا اللون", source: "صورة المنتج" },
    checkout: { title: "إتمام الطلب", name: "الاسم الكامل", phone: "الهاتف", city: "المدينة", address: "العنوان", submit: "تأكيد الطلب", success: "تم تسجيل الطلب", note: "سيتواصل فريقنا معك لتأكيد التوصيل." },
    footer: { line: "أساسيات HAWANA بأفضل سعر.", help: "تحتاج مساعدة؟", rights: "HAWANA. جميع الحقوق محفوظة." },
  },
  en: {
    nav: { shop: "Shop", packs: "Packs", brands: "Brands" },
    hero: { titleA: "Everything goes.", titleB: "Style stays.", body: "ALSAMAH essentials in their real cuts and colors, brought together by HAWANA.", shop: "Shop the offers", pack: "Build my pack" },
    strip: ["Up to 40% off packs", "Limited runs", "Delivery across Morocco"],
    catalog: { title: "The HAWANA selection", body: "Choose your piece, color and size, then order directly.", all: "All", women: "Women", men: "Men", kids: "Kids", other: "Other", incomplete: "Incomplete", add: "Add", details: "View product", empty: "No products in this selection.", count: "products", loadMore: "Show more", imagePending: "Photo coming soon", pricePending: "Coming soon", unavailable: "Unavailable" },
    packs: { title: "Bundle more. Save more.", body: "Choose your essentials and unlock the pack price automatically.", create: "Add pack to cart", selection: "Your pack", incomplete: "Add", item: "item", items: "items" },
    brands: { title: "Two signatures. One house.", alsamah: "ALSAMAH completes every silhouette with essentials designed for daily life.", elko: "ELKO is joining the HAWANA selection soon.", discover: "Discover ALSAMAH", soon: "Coming soon to HAWANA" },
    cart: { title: "Your cart", empty: "Your cart is waiting for its first good find.", continue: "Continue shopping", subtotal: "Subtotal", delivery: "Delivery calculated at the next step", checkout: "Checkout", remove: "Remove", promo: "Promo code", apply: "Apply", invalid: "Code not recognized", applied: "HAWANA10 applied" },
    product: { color: "Color", size: "Size", stock: "available", add: "Add to cart", close: "Close", generated: "Available in this color", source: "Product photo" },
    checkout: { title: "Complete your order", name: "Full name", phone: "Phone", city: "City", address: "Address", submit: "Confirm order", success: "Order saved", note: "Our team will contact you to confirm delivery." },
    footer: { line: "HAWANA essentials at the best price.", help: "Need help?", rights: "HAWANA. All rights reserved." },
  },
} as const;
