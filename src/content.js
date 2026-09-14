// Single source of truth for every string on the site.
// Each entry is { ar, en } — the build picks a language and emits static HTML.

export const site = {
  domain: "https://www.velorci.com",
  dashboard: "https://my.velorci.com",
  email: "hello@velorci.com",
  whatsapp: "+965 9968 3994",
  whatsappHref: "https://wa.me/96599683994",
};

export const meta = {
  ar: {
    lang: "ar",
    dir: "rtl",
    siteName: "velorci",
    titleSuffix: "velorci",
    ogLocale: "ar_KW",
    switchLabel: "EN",
    switchTitle: "Switch to English",
    skipToContent: "تخطَّ إلى المحتوى",
    menuLabel: "القائمة",
  },
  en: {
    lang: "en",
    dir: "ltr",
    siteName: "velorci",
    titleSuffix: "velorci",
    ogLocale: "en_US",
    switchLabel: "ع",
    switchTitle: "التبديل إلى العربية",
    skipToContent: "Skip to content",
    menuLabel: "Menu",
  },
};

// Page id -> { path per language, nav label, <title>, meta description }
export const pages = {
  home: {
    path: { ar: "/", en: "/en" },
    file: { ar: "index.html", en: "en/index.html" },
    nav: { ar: "الرئيسية", en: "Home" },
    // Titles and descriptions lead with the words merchants actually search
    // for ("إدارة طلبات", "متجر إلكتروني") — not the product category.
    title: {
      ar: "برنامج إدارة طلبات وتوصيل لتجّار انستقرام وواتساب — velorci",
      en: "Order & delivery software for Instagram and WhatsApp sellers — velorci",
    },
    description: {
      ar: "بتاخذ طلباتك على انستقرام وواتساب؟ velorci بيجمعها في صندوق واحد، بيتابع كل طلب من التجهيز للتسليم، وبيحاسب عنك تلقائياً — مع متجر إلكتروني بدومينك.",
      en: "Taking orders through Instagram and WhatsApp? velorci collects them in one inbox, tracks every order from prep to delivery, and does your accounting automatically — with an online store on your own domain.",
    },
  },
  about: {
    path: { ar: "/about", en: "/en/about" },
    file: { ar: "about.html", en: "en/about.html" },
    nav: { ar: "من نحن", en: "About" },
    title: { ar: "من نحن — velorci", en: "About — velorci" },
    description: {
      ar: "velorci منصة SaaS متعددة الشركات تدير أعمال التاجر بالكامل من لوحة واحدة، بعزل بيانات كامل لكل عميل.",
      en: "velorci is a multi-tenant SaaS platform running a merchant's entire operation from one dashboard, with full data isolation per customer.",
    },
  },
  services: {
    path: { ar: "/services", en: "/en/services" },
    file: { ar: "services.html", en: "en/services.html" },
    nav: { ar: "الخدمات", en: "Services" },
    title: { ar: "الخدمات — velorci", en: "Services — velorci" },
    description: {
      ar: "طلبات وتوصيل، متجر إلكتروني، نقطة بيع، محاسبة كاملة، واتساب أعمال وذكاء اصطناعي، إعلانات ومدفوعات — في منصة واحدة.",
      en: "Orders and delivery, online store, POS, full accounting, WhatsApp Business with AI, ads and payments — in one platform.",
    },
  },
  team: {
    path: { ar: "/team", en: "/en/team" },
    file: { ar: "team.html", en: "en/team.html" },
    nav: { ar: "فريق العمل", en: "Team" },
    title: { ar: "فريق العمل — velorci", en: "Team — velorci" },
    description: {
      ar: "تطبيق مستقل بصلاحيات محددة لكل دور في عملك — من المدير حتى الكاشير.",
      en: "A dedicated app with clear permissions for every role — from the manager to the cashier.",
    },
  },
  contact: {
    path: { ar: "/contact", en: "/en/contact" },
    file: { ar: "contact.html", en: "en/contact.html" },
    nav: { ar: "تواصل معنا", en: "Contact" },
    title: { ar: "تواصل معنا — velorci", en: "Contact — velorci" },
    description: {
      ar: "احجز عرضاً تجريبياً مجانياً أو اسألنا أي شيء عن منصة velorci.",
      en: "Book a free demo or ask us anything about the velorci platform.",
    },
  },
};

export const navOrder = ["home", "about", "services", "team", "contact"];

export const ui = {
  cta: { ar: "احجز عرضاً", en: "Book a demo" },
  login: { ar: "دخول لوحة التحكم", en: "Dashboard login" },
  rights: {
    ar: "© 2026 velorci. جميع الحقوق محفوظة.",
    en: "© 2026 velorci. All rights reserved.",
  },
  footerTagline: {
    ar: "منصة تشغيل أعمال متكاملة للتجّار في الخليج والعالم العربي.",
    en: "A complete business operating platform for merchants across the Gulf and the Arab world.",
  },
  footerNavTitle: { ar: "الموقع", en: "Site" },
  footerContactTitle: { ar: "تواصل", en: "Contact" },
};

export const home = {
  // Names the audience before anything else, so a visitor knows in one
  // second whether this page is for them.
  eyebrow: {
    ar: "لتجّار انستقرام وواتساب",
    en: "For Instagram & WhatsApp sellers",
  },
  title: {
    ar: "طلباتك من انستقرام وواتساب — في مكان واحد، ومنظّمة",
    en: "Your Instagram and WhatsApp orders — in one place, finally organised",
  },
  // Three ideas, not seven: collect, track, account.
  sub: {
    ar: "لو بتبيع على السوشال وبتوصّل بنفسك: velorci بيجمع طلباتك من كل قناة في صندوق واحد، بيتابع كل طلب من التجهيز حتى التسليم، وبيمسك حسابك تلقائياً.",
    en: "If you sell on social and deliver yourself: velorci gathers your orders from every channel into one inbox, tracks each one from prep to delivery, and keeps your books automatically.",
  },
  cta1: { ar: "اطلب عرضاً", en: "Request a demo" },
  cta2: { ar: "شوف كيف بتشتغل", en: "See how it works" },

  // "Is this you?" — the qualifier. Every line is a situation the target
  // merchant is living right now, in their own words.
  audience: {
    title: { ar: "هاد أنت؟", en: "Sound familiar?" },
    sub: {
      ar: "لو واحدة من هدول بتوصفك، velorci مبني إلك.",
      en: "If any of these describes you, velorci was built for you.",
    },
    items: [
      {
        ar: "بتوصلك طلبات على الخاص في انستقرام وواتساب، وبتكتبها بدفتر أو بملاحظات الجوال.",
        en: "Orders arrive in your Instagram and WhatsApp DMs, and you write them in a notebook or your phone's notes.",
      },
      {
        ar: "عندك سائق أو اتنين، وكل شوي بتتصل تسأل وين وصل الطلب.",
        en: "You have a driver or two, and you keep calling to ask where an order got to.",
      },
      {
        ar: "بتحسب أرباحك آخر الشهر على إكسل — أو ما بتحسبها أصلاً.",
        en: "You work out your profit at month end in a spreadsheet — or never quite get to it.",
      },
      {
        ar: "بدك متجر إلكتروني، بس كل العروض اللي جتك غالية أو بدها مبرمج.",
        en: "You want an online store, but every quote you got was expensive or needed a developer.",
      },
    ],
  },

  // How it actually works — the step a confused visitor needs most.
  howItWorks: {
    title: { ar: "كيف بتشتغل", en: "How it works" },
    sub: {
      ar: "ثلاث خطوات، وبتكون شغّال. بدون برمجة وبدون تنصيب.",
      en: "Three steps and you're running. No code, no installation.",
    },
    steps: [
      {
        title: { ar: "اربط قنواتك", en: "Connect your channels" },
        body: {
          ar: "واتساب الأعمال ومتجرك وطلبات انستقرام — كلها بتصبّ في صندوق طلبات واحد، بدل ما تلاحقها بين التطبيقات.",
          en: "WhatsApp Business, your store and your Instagram orders all flow into one inbox, instead of you chasing them between apps.",
        },
      },
      {
        title: { ar: "تابع الطلب بمراحله", en: "Track each order's stages" },
        body: {
          ar: "تجهيز، تعبئة، توصيل، تسليم — بمراحل إنت بتحددها. وكل موظف وسائق عنده تطبيقه وبيشوف اللي يخصه بس.",
          en: "Prep, packing, delivery, handover — in stages you define. Every staff member and driver gets their own app showing only their work.",
        },
      },
      {
        title: { ar: "الأرقام بتمشي لحالها", en: "The numbers keep themselves" },
        body: {
          ar: "كل طلب مكتمل بيسجّل إيراده تلقائياً. المصاريف والتقارير والفواتير جاهزة — بدون ما تفتح إكسل.",
          en: "Every completed order books its own revenue. Expenses, reports and invoices are ready — without opening a spreadsheet.",
        },
      },
    ],
  },

  marquee: [
    { ar: "إدارة الطلبات", en: "Orders" },
    { ar: "متجر إلكتروني", en: "Online Store" },
    { ar: "محاسبة كاملة", en: "Accounting" },
    { ar: "واتساب أعمال", en: "WhatsApp Business" },
    { ar: "وكيل ذكاء اصطناعي", en: "AI Agent" },
    { ar: "نقطة بيع POS", en: "POS" },
    { ar: "إعلانات ميتا", en: "Meta Ads" },
    { ar: "مدفوعات KNET", en: "KNET Payments" },
  ],

  problem: {
    title: { ar: "يومك قبل، ويومك بعد", en: "Your day before, and after" },
    sub: {
      ar: "الوضع اللي بتعيشه اليوم، وشو بيصير محلّه.",
      en: "What you live with today, and what takes its place.",
    },
    beforeLabel: { ar: "قبل", en: "Before" },
    afterLabel: { ar: "مع velorci", en: "With velorci" },
    rows: [
      {
        p: { ar: "طلبات متفرقة بين واتساب والموقع وانستقرام", en: "Orders scattered across WhatsApp, website and Instagram" },
        s: { ar: "صندوق طلبات موحّد يجمع كل الطلبات تلقائياً", en: "One unified inbox collects every order automatically" },
      },
      {
        p: { ar: "لا تعرف أين وصل كل طلب", en: "No visibility into where each order stands" },
        s: { ar: "مراحل طلب مخصصة من التجهيز حتى التسليم", en: "Custom order stages from prep to delivery" },
      },
      {
        p: { ar: "فريق توصيل وتعبئة بدون تنظيم", en: "Delivery and packing team with no structure" },
        s: { ar: "تطبيق منفصل لكل موظف بصلاحيات محددة", en: "A dedicated app per role with clear permissions" },
      },
      {
        p: { ar: "محاسبة على ورق أو إكسل", en: "Accounting on paper or spreadsheets" },
        s: { ar: "نظام محاسبة كامل بإيرادات ومصاريف وتقارير", en: "Full accounting with revenue, expenses and reports" },
      },
      {
        p: { ar: "متجر إلكتروني مكلف ومعقّد", en: "Expensive, complex online store setups" },
        s: { ar: "متجر جاهز بدومين خاص وسحب وإفلات", en: "Ready store with your own domain, drag-and-drop" },
      },
      {
        p: { ar: "تسويق واتساب يدوي", en: "Manual WhatsApp marketing" },
        s: { ar: "واتساب رسمي + بث جماعي + وكيل ذكاء يرد تلقائياً", en: "Official WhatsApp, broadcasts, AI agent replies automatically" },
      },
      {
        p: { ar: "إعلانات ميتا بدون تتبع", en: "Meta ads with no tracking" },
        s: { ar: "إعلانات + تتبع تحويلات + كتالوج منتجات", en: "Ads, conversion tracking and a product catalog" },
      },
    ],
  },

  features: {
    title: {
      ar: "شو بتقدر تشغّل من نفس اللوحة",
      en: "What you can run from the same dashboard",
    },
    sub: {
      ar: "مش أدوات منفصلة بتربطها ببعض — كلها جوّة بعض، وبتشتغل على نفس الطلب ونفس العميل.",
      en: "Not separate tools you wire together — all of it lives in one place, working on the same order and the same customer.",
    },
    seeAll: { ar: "شاهد كل الخدمات", en: "See all services" },
    items: [
      {
        badge: "OD",
        title: { ar: "الطلبات والتوصيل", en: "Orders & Delivery" },
        desc: {
          ar: "صندوق موحّد، مراحل قابلة للتخصيص، تقويم توصيل وتعيين للموظفين بضغطة.",
          en: "Unified inbox, custom stages, delivery calendar and one-tap staff assignment.",
        },
      },
      {
        badge: "ST",
        title: { ar: "المتجر الإلكتروني", en: "Online Store" },
        desc: {
          ar: "متجر جاهز بدومين خاص، مصمّم بالسحب والإفلات بدون برمجة.",
          en: "A ready store with your own domain, built drag-and-drop, no code.",
        },
      },
      {
        badge: "WA",
        title: { ar: "واتساب وذكاء اصطناعي", en: "WhatsApp & AI" },
        desc: {
          ar: "واتساب أعمال رسمي، بث جماعي، ووكيل ذكاء يرد على عملائك تلقائياً.",
          en: "Official WhatsApp business, broadcasts, and an AI agent replying automatically.",
        },
      },
      {
        badge: "AC",
        title: { ar: "المحاسبة الكاملة", en: "Full Accounting" },
        desc: {
          ar: "إيرادات آلية من الطلبات، مصاريف، قيود، وتقارير قابلة للتصدير.",
          en: "Automatic revenue from orders, expenses, journal entries and exportable reports.",
        },
      },
      {
        badge: "PS",
        title: { ar: "نقطة البيع POS", en: "Point of Sale" },
        desc: {
          ar: "شاشة كاشير للمحل بفاتورة حرارية، مبيعاتها تدخل نفس النظام.",
          en: "In-store cashier with thermal receipts, feeding the same system.",
        },
      },
      {
        badge: "AD",
        title: { ar: "إعلانات ميتا", en: "Meta Ads" },
        desc: {
          ar: "إنشاء إعلانات وتتبع تحويلات وكاتب نصوص بالذكاء الاصطناعي.",
          en: "Create ads, track conversions, with an AI copywriter.",
        },
      },
    ],
  },

  ai: {
    tag: { ar: "ذكاء اصطناعي", en: "Artificial intelligence" },
    title: {
      ar: "وكيل ذكاء اصطناعي يرد على عملائك",
      en: "An AI agent that answers your customers",
    },
    body: {
      ar: "على واتساب الأعمال الرسمي: رد آلي ذكي يتعلّم من سياسات متجرك، بشخصية قابلة للتخصيص، ويحوّل المحادثة لموظف بشري عند الحاجة.",
      en: "On official WhatsApp Business: a smart auto-reply that learns your store's policies, has a customizable personality, and hands off to a human when needed.",
    },
    points: [
      { ar: "يتعلّم من سياسات متجرك ومنتجاتك", en: "Learns your store's policies and products" },
      { ar: "مستويات ذكاء وتكلفة قابلة للاختيار", en: "Selectable intelligence and cost tiers" },
      { ar: "تحويل فوري لموظف بشري عند الحاجة", en: "Instant handoff to a human when needed" },
    ],
    chatName: { ar: "متجرك على واتساب", en: "Your store on WhatsApp" },
    chatStatus: { ar: "وكيل velorci الذكي — متصل", en: "velorci AI agent — online" },
    msg1: { ar: "السلام عليكم، متى يوصل طلبي؟", en: "Hi, when will my order arrive?" },
    msg2: {
      ar: "وعليكم السلام! طلبك رقم ٤٨٢ في مرحلة التوصيل، ويصلك اليوم بين ٥–٧ مساءً.",
      en: "Hello! Order #482 is out for delivery — arriving today between 5–7 pm.",
    },
    msg3: { ar: "ممكن أضيف قطعة ثانية؟", en: "Can I add another item?" },
  },

  showcase: {
    // Set `screenshot` to a real capture (e.g. "assets/app-home.png") and the
    // page renders that image instead of the drawn mock-up below. Keep it null
    // until a genuine screenshot exists — a drawn mock-up that pretends to be
    // a screenshot costs more trust than it buys.
    screenshot: null,
    screenshotAlt: {
      ar: "الشاشة الرئيسية لتطبيق velorci على الجوال",
      en: "The velorci mobile app home screen",
    },
    tag: { ar: "المنصة على أرض الواقع", en: "The platform in real life" },
    title: { ar: "لوحة تحكم كاملة… في جيبك", en: "A full dashboard… in your pocket" },
    body: {
      ar: "تابع الإيرادات والطلبات والمحادثات لحظة بلحظة من الموبايل. كل رقم حي، وكل مؤشر يتحدّث تلقائياً — بدون أي إكسل أو أوراق.",
      en: "Track revenue, orders and chats in real time from your phone. Every number is live and updates automatically — no spreadsheets, no paperwork.",
    },
    points: [
      { ar: "صافي الإيرادات والمرتجعات في لمحة", en: "Net revenue and returns at a glance" },
      { ar: "متوسط قيمة الطلب وعدد الطلبات مباشرة", en: "Live average order value and order counts" },
      { ar: "تنبيهات «تحتاج انتباهك» قبل ما تصير مشكلة", en: "'Needs attention' alerts before things go wrong" },
    ],
    phone: {
      header: { ar: "الرئيسية", en: "Home" },
      attention: { ar: "تحتاج انتباهك", en: "Needs attention" },
      dateRange: { ar: "١ يناير — ١٨ يوليو", en: "1 Jan — 18 Jul" },
      netLabel: { ar: "صافي الإيرادات", en: "Net revenue" },
      netValue: "34,892.115",
      returned: { ar: "مرتجع: 224.750 (3)", en: "Returned: 224.750 (3)" },
      avgLabel: { ar: "متوسط الطلب", en: "Avg order" },
      avgValue: "63.440",
      ordersLabel: { ar: "الطلبات", en: "Orders" },
      ordersValue: "550",
      ordersSub: { ar: "459 مكتمل · 91 قيد التنفيذ", en: "459 done · 91 in progress" },
      waLabel: "WhatsApp",
      waRead: { ar: "الكل مقروء", en: "All read" },
      cur: { ar: "د.ك", en: "KD" },
    },
  },

  sellers: {
    title: { ar: "الأكثر مبيعاً", en: "Top sellers" },
    sub: {
      ar: "المنصة ترتّب منتجاتك تلقائياً حسب المبيعات والإيراد — تعرف بالضبط شو يبيع.",
      en: "The platform ranks your products automatically by sales and revenue — you know exactly what sells.",
    },
    pcs: { ar: "قطعة", en: "pcs" },
    cur: { ar: "د.ك", en: "KD" },
    items: [
      { rank: 1, name: { ar: "أريكة جلدية فاخرة - أسود", en: "Premium Leather Sofa - Black" }, pcs: 31, amount: "1,742.500", pct: 100, img: "assets/prod-1.png" },
      { rank: 2, name: { ar: "كرسي مكتب قابل للتعديل - كحلي", en: "Adjustable Office Chair - Navy" }, pcs: 27, amount: "1,510.200", pct: 88, img: "assets/prod-2.png" },
      { rank: 3, name: { ar: "طاولة طعام خشبية - بني", en: "Wooden Dining Table - Brown" }, pcs: 24, amount: "1,388.000", pct: 80, img: "assets/prod-3.png" },
      { rank: 4, name: { ar: "مصباح أرضي معاصر - أبيض", en: "Modern Floor Lamp - White" }, pcs: 18, amount: "612.300", pct: 60, img: "assets/prod-4.png" },
      { rank: 5, name: { ar: "وسادة ديكور مزخرفة - رمادي", en: "Decorative Throw Pillow - Gray" }, pcs: 15, amount: "245.750", pct: 48, img: "assets/prod-5.png" },
      { rank: 6, name: { ar: "سجادة صوف طبيعي - بيج", en: "Natural Wool Rug - Beige" }, pcs: 13, amount: "188.400", pct: 42, img: "assets/prod-6.png" },
    ],
  },

  analytics: {
    tag: { ar: "تحليلات الزوار", en: "Visitor analytics" },
    title: { ar: "افهم زوّارك، مش بس عدّهم", en: "Understand your visitors, don't just count them" },
    sub: {
      ar: "مصدر الزيارات، معدل التحويل، الأجهزة، ونسبة العائدين — كلها محسوبة تلقائياً في لوحة واحدة.",
      en: "Traffic sources, conversion rate, devices and returning-visitor rate — all computed automatically in one dashboard.",
    },
    topSource: { ar: "أهم مصدر اليوم", en: "Top source today" },
    topSourceVal: { ar: "انستغرام", en: "Instagram" },
    cards: [
      { label: { ar: "إجمالي الزيارات · 18 يوم", en: "Total visits · 18 days" }, value: "1,940", delta: "309%", up: true, sub: { ar: "مقارنة بالفترة السابقة", en: "vs previous period" } },
      { label: { ar: "معدل التحويل", en: "Conversion rate" }, value: "0.3%", sub: { ar: "زيارة ← طلب", en: "visit → order" } },
      { label: { ar: "إيرادات الزيارات", en: "Visit revenue" }, value: { ar: "281.150 د.ك", en: "281.150 KD" }, sub: { ar: "متوسط الطلب 46.858 د.ك", en: "avg order 46.858 KD" } },
      { label: { ar: "الطلبات", en: "Orders" }, value: "6", sub: { ar: "من الزيارات", en: "from visits" } },
      { label: { ar: "المعدل اليومي", en: "Daily average" }, value: "108", sub: { ar: "خلال 18 يوم", en: "over 18 days" } },
      { label: { ar: "نسبة العائدين", en: "Returning rate" }, value: "20%", delta: "20%", up: true, sub: { ar: "300 زائر عائد", en: "300 returning" } },
    ],
  },

  finalCta: {
    title: {
      ar: "خلّي طلباتك تنظّم حالها",
      en: "Let your orders organise themselves",
    },
    sub: {
      ar: "احجز عرضاً مجانياً — بنفرجيك المنصة على عملك إنت، مش على حساب تجريبي.",
      en: "Book a free demo — we'll walk through the platform on your business, not a dummy account.",
    },
    cta: { ar: "احجز عرضاً مجانياً", en: "Book a free demo" },
  },
};

export const packages = {
  title: {
    ar: "باقات مرنة تناسب حجم عملك",
    en: "Flexible plans for every business size",
  },
  sub: {
    ar: "فعّل أو أوقف أي موديول حسب حاجتك — بدون عقود طويلة.",
    en: "Turn any module on or off as you need — no long contracts.",
  },
  popular: { ar: "الأكثر طلباً", en: "Most popular" },
  perMonth: { ar: "شهرياً", en: "per month" },
  cur: { ar: "د.ك", en: "KD" },
  cta: { ar: "اطلب هذه الباقة", en: "Choose this plan" },
  items: [
    {
      key: "starter",
      price: "200",
      name: { ar: "أساسية", en: "Starter" },
      bullets: {
        ar: ["إدارة الطلبات والمراحل", "تطبيق سائق", "فواتير", "إشعارات واتساب أساسية"],
        en: ["Order management & stages", "Driver app", "Invoices", "Basic WhatsApp notifications"],
      },
    },
    {
      key: "growth",
      price: "300",
      name: { ar: "نمو", en: "Growth" },
      bullets: {
        ar: ["كل ما في الأساسية", "متجر إلكتروني بدومين خاص", "CRM وكوبونات وتقييمات", "نقطة بيع POS"],
        en: ["Everything in Starter", "Online store with custom domain", "CRM, coupons & reviews", "Point of Sale"],
      },
    },
    {
      key: "pro",
      price: "550",
      highlight: true,
      name: { ar: "احترافية", en: "Pro" },
      bullets: {
        ar: ["كل ما في النمو", "محاسبة كاملة", "مشتريات وتكاليف", "واتساب أعمال وبريد وتقارير مجدولة"],
        en: ["Everything in Growth", "Full accounting", "Purchasing & costing", "WhatsApp business, email & scheduled reports"],
      },
    },
    {
      key: "ent",
      price: "700",
      name: { ar: "متقدمة", en: "Enterprise" },
      bullets: {
        ar: ["كل ما في الاحترافية", "وكيل ذكاء اصطناعي على واتساب", "إعلانات ميتا وكتالوج منتجات", "مدفوعات وأدوار فريق كاملة"],
        en: ["Everything in Pro", "AI agent on WhatsApp", "Meta ads & product catalog", "Payments & full team roles"],
      },
    },
  ],
};

export const about = {
  title: { ar: "من نحن", en: "About velorci" },
  pitch: {
    ar: "velorci منصة SaaS متكاملة (Business Operating Platform) تدير أعمال التاجر بالكامل من لوحة واحدة، بدون الحاجة لربط أدوات متعددة. المنصة متعددة الشركات — كل عميل يحصل على مساحة معزولة تماماً ببياناته ومستخدميه ومتجره ودومينه.",
    en: "velorci is a complete business operating platform that runs a merchant's entire operation from a single dashboard, without stitching together separate tools. It is multi-tenant — every customer gets a fully isolated space with their own data, users, store and domain.",
  },
  cards: [
    {
      title: { ar: "لمن نصمم", en: "Who we build for" },
      body: {
        ar: "تجّار التجارة الإلكترونية، الأعمال التي تعتمد على التوصيل، فرق ميدانية من سائقين وخياطين ومعبّئين، وتجّار يبيعون عبر واتساب وانستقرام ويريدون تنظيم طلباتهم.",
        en: "E-commerce merchants, delivery-dependent businesses, field teams of drivers, tailors and packers, and merchants selling through WhatsApp and Instagram who want their orders organized.",
      },
    },
    {
      title: { ar: "البنية التقنية", en: "Built on" },
      body: {
        ar: "واجهة React، بيانات Firebase، دوال Serverless على Vercel، وتخزين صور على Cloudflare R2 — يعمل أونلاين على أي جهاز بلا تنصيب.",
        en: "React frontend, Firebase data, serverless functions on Vercel, and image storage on Cloudflare R2 — works online on any device, no installation.",
      },
    },
  ],
  whyTitle: { ar: "لماذا velorci", en: "Why velorci" },
  whyItems: [
    { ar: "الكل في واحد: طلبات، متجر، محاسبة، واتساب، إعلانات وPOS في اشتراك واحد.", en: "All-in-one: orders, store, accounting, WhatsApp, ads and POS in one subscription." },
    { ar: "عزل بيانات كامل: بيانات كل عميل معزولة تماماً عن غيره.", en: "Full data isolation: every customer's data is completely separate." },
    { ar: "بدون برمجة: متجر بالسحب والإفلات ودومين خاص.", en: "No code needed: drag-and-drop store builder with your own domain." },
    { ar: "ذكاء اصطناعي عملي: وكيل واتساب وكاتب إعلانات وتحليل لوحة.", en: "Practical AI: WhatsApp agent, ad copywriter and dashboard insights." },
    { ar: "يعمل على أي جهاز، بلا تنصيب.", en: "Works on any device, no installation needed." },
    { ar: "دعم كامل للعربية والإنجليزية بوضع فاتح وغامق.", en: "Full Arabic and English support, light and dark mode." },
    { ar: "باقات مرنة: فعّل أو أوقف أي موديول حسب حاجتك.", en: "Flexible plans: turn any module on or off as you need." },
    { ar: "بنية سحابية حديثة وموثوقة.", en: "Modern, reliable cloud architecture." },
  ],
};

export const services = {
  title: { ar: "الخدمات", en: "Services" },
  sub: {
    ar: "كل موديول تحتاجه لإدارة عملك، مبني في منصة واحدة.",
    en: "Every module your business needs, built into one platform.",
  },
  modules: [
    { badge: "OD", title: { ar: "إدارة الطلبات والتوصيل", en: "Orders & Delivery" }, desc: { ar: "صندوق طلبات موحّد، مراحل مخصصة، تقويم توصيل وتعيين للموظفين.", en: "Unified inbox, custom stages, delivery calendar and staff assignment." } },
    { badge: "TM", title: { ar: "تطبيقات الفريق", en: "Team Apps" }, desc: { ar: "تطبيق مستقل لكل دور: مدير، موظف، سائق، خياط، معبّئ، كاشير.", en: "A dedicated app per role: manager, staff, driver, tailor, packer, cashier." } },
    { badge: "ST", title: { ar: "المتجر الإلكتروني", en: "Online Store" }, desc: { ar: "مصمّم متجر بالسحب والإفلات، كوبونات، سلات متروكة، تقييمات.", en: "Drag-and-drop store builder, coupons, abandoned carts, reviews." } },
    { badge: "PS", title: { ar: "نقطة البيع POS", en: "Point of Sale" }, desc: { ar: "شاشة كاشير للمحل مع فاتورة طباعة حرارية وتقرير مبيعات.", en: "In-store cashier screen with thermal receipts and sales reports." } },
    { badge: "PR", title: { ar: "المنتجات والمخزون", en: "Products & Inventory" }, desc: { ar: "تكاليف المنتجات، المشتريات، وأوامر شراء تلقائية.", en: "Product costing, purchasing, and automatic purchase orders." } },
    { badge: "AC", title: { ar: "المحاسبة الكاملة", en: "Full Accounting" }, desc: { ar: "إيرادات آلية، مصاريف، قيود محاسبية، وتقارير قابلة للتصدير.", en: "Automatic revenue, expenses, journal entries and exportable reports." } },
    { badge: "WA", title: { ar: "واتساب أعمال + ذكاء اصطناعي", en: "WhatsApp Business + AI" }, desc: { ar: "قوالب معتمدة، بث جماعي، ووكيل ذكاء يرد تلقائياً على العملاء.", en: "Approved templates, broadcasts, and an AI agent replying to customers." } },
    { badge: "EM", title: { ar: "البريد الإلكتروني", en: "Email" }, desc: { ar: "رسائل آلية للفواتير والتأكيدات مع قوالب قابلة للتخصيص.", en: "Automated invoice and confirmation emails with custom templates." } },
    { badge: "AD", title: { ar: "الإعلانات", en: "Advertising" }, desc: { ar: "إنشاء إعلانات ميتا، كاتب نصوص بالذكاء الاصطناعي، وتتبع تحويلات.", en: "Create Meta ads, AI ad copywriter, and conversion tracking." } },
    { badge: "PM", title: { ar: "المدفوعات الإلكترونية", en: "Payments" }, desc: { ar: "بطاقات وKNET والتقسيط، مرتبطة مباشرة بحالة الطلب.", en: "Cards, KNET and installments, linked to order status." } },
    { badge: "CR", title: { ar: "إدارة العملاء CRM", en: "Customer CRM" }, desc: { ar: "ملف لكل عميل، تصنيف تلقائي، وسجل طلبات كامل.", en: "A profile per customer, automatic segmentation, full order history." } },
    { badge: "RP", title: { ar: "التقارير والفواتير", en: "Reports & Invoices" }, desc: { ar: "لوحة إحصائيات، تقارير مجدولة، وفواتير جاهزة للطباعة.", en: "Dashboards, scheduled reports, and print-ready invoices." } },
  ],
};

export const team = {
  title: { ar: "فريق عملك على المنصة", en: "Your team on the platform" },
  sub: {
    ar: "تطبيق مستقل بصلاحيات محددة لكل دور في عملك — من المدير حتى الكاشير.",
    en: "A dedicated app with clear permissions for every role — from the manager to the cashier.",
  },
  roles: [
    { initial: "M", name: { ar: "مدير الشركة", en: "Company Manager" }, desc: { ar: "لوحة كاملة، إعدادات، محاسبة وإحصائيات.", en: "Full dashboard, settings, accounting and analytics." } },
    { initial: "E", name: { ar: "موظف", en: "Employee" }, desc: { ar: "الطلبات المُسندة وتحصيل الكاش وإرسال الفواتير.", en: "Assigned orders, cash collection and sending invoices." } },
    { initial: "D", name: { ar: "سائق", en: "Driver" }, desc: { ar: "طلباته، العنوان، والتواصل مع العميل للتسليم.", en: "Their orders, addresses and customer contact for delivery." } },
    { initial: "T", name: { ar: "خياط", en: "Tailor" }, desc: { ar: "الطلبات قيد الخياطة والقياسات وتوفّر الخام.", en: "Orders in progress, measurements and material availability." } },
    { initial: "P", name: { ar: "معبّئ", en: "Packer" }, desc: { ar: "الطلبات الجاهزة للتعبئة وتنبيه السائق.", en: "Orders ready for packing and alerting the driver." } },
    { initial: "C", name: { ar: "كاشير", en: "Cashier" }, desc: { ar: "نقطة بيع كاملة لمبيعات المحل.", en: "A full point-of-sale for in-store sales." } },
  ],
};

export const contact = {
  title: { ar: "تواصل معنا", en: "Get in touch" },
  body: {
    ar: "راسلنا لحجز عرض تجريبي أو لأي استفسار عن المنصة، ونتواصل معك قريباً.",
    en: "Reach out to book a demo or ask anything about the platform — we'll get back to you soon.",
  },
  emailLabel: { ar: "البريد", en: "Email" },
  whatsappLabel: { ar: "واتساب", en: "WhatsApp" },
  regionLabel: { ar: "المنطقة", en: "Region" },
  regionValue: { ar: "الخليج والعالم العربي", en: "Gulf & the Arab world" },
  formTitle: { ar: "اطلب عرضاً تجريبياً", en: "Request a demo" },
  namePlaceholder: { ar: "الاسم", en: "Name" },
  phonePlaceholder: { ar: "الهاتف / واتساب", en: "Phone / WhatsApp" },
  companyPlaceholder: { ar: "اسم الشركة", en: "Company name" },
  messagePlaceholder: { ar: "رسالتك", en: "Your message" },
  submit: { ar: "إرسال", en: "Submit" },
  sending: { ar: "جارٍ الإرسال…", en: "Sending…" },
  successTitle: { ar: "تم الإرسال بنجاح", en: "Message sent" },
  successBody: {
    ar: "شكراً لتواصلك معنا، سيقوم فريقنا بالرد عليك قريباً.",
    en: "Thanks for reaching out — our team will get back to you soon.",
  },
  // Shown if JS is unavailable or the form cannot be submitted.
  fallbackNote: {
    ar: "تفضّل الواتساب؟ راسلنا مباشرة",
    en: "Prefer WhatsApp? Message us directly",
  },
};
