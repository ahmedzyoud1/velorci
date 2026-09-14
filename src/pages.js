import {
  site,
  home,
  packages,
  about,
  services,
  team,
  contact,
} from "./content.js";
import { esc, t, tx, icons, url, asset } from "./layout.js";

/* --- shared blocks ------------------------------------------------------ */

function sectionHead({ eyebrow, title, sub, lang, center = false, id }) {
  const cls = center ? "section-head section-head--center" : "section-head";
  const titleId = id ? ` id="${id}"` : "";
  return `<div class="${cls}">
        ${eyebrow ? `<p class="eyebrow">${tx(eyebrow, lang)}</p>` : ""}
        <h2 class="h-section"${titleId}>${tx(title, lang)}</h2>
        ${sub ? `<p class="lede">${tx(sub, lang)}</p>` : ""}
      </div>`;
}

function checkList(items, lang) {
  return `<ul class="checks">
          ${items
            .map((p) => `<li>${icons.check}<span>${tx(p, lang)}</span></li>`)
            .join("\n          ")}
        </ul>`;
}

/** Pricing — reused on the home page and the services page. */
function plansSection(lang, { wash = false } = {}) {
  const cards = packages.items
    .map((p) => {
      const featured = p.highlight;
      const bullets = t(p.bullets, lang)
        .map((b) => `<li>${icons.check}<span>${esc(b)}</span></li>`)
        .join("\n            ");
      return `<article class="plan${featured ? " plan--featured" : ""}" data-reveal>
          ${
            featured
              ? `<span class="plan__tag">${tx(packages.popular, lang)}</span>`
              : ""
          }
          <h3 class="plan__name">${tx(p.name, lang)}</h3>
          <p class="plan__price"><b>${esc(p.price)}</b> <span>${tx(
        packages.cur,
        lang
      )} / ${tx(packages.perMonth, lang)}</span></p>
          <ul>
            ${bullets}
          </ul>
          <a class="btn ${
            featured ? "btn--primary" : "btn--ghost"
          }" href="${url("contact", lang)}">${tx(packages.cta, lang)}</a>
        </article>`;
    })
    .join("\n        ");

  return `<section class="section${wash ? " section--wash" : ""}" aria-labelledby="plans-title">
      <div class="wrap">
        ${sectionHead({
          title: packages.title,
          sub: packages.sub,
          lang,
          center: true,
          id: "plans-title",
        })}
        <div class="plans">
        ${cards}
        </div>
      </div>
    </section>`;
}

function ctaBand(lang) {
  return `<section class="section">
      <div class="wrap">
        <div class="cta-band" data-reveal>
          <h2>${tx(home.finalCta.title, lang)}</h2>
          <p class="lede">${tx(home.finalCta.sub, lang)}</p>
          <a class="btn btn--primary" href="${url("contact", lang)}">${tx(
    home.finalCta.cta,
    lang
  )}</a>
        </div>
      </div>
    </section>`;
}

/** Shared page intro for the inner pages. */
function pageHero(titleValue, subValue, lang) {
  return `<section class="section--tight">
      <div class="wrap wrap--narrow page-hero">
        <h1 class="h-page">${tx(titleValue, lang)}</h1>
        ${subValue ? `<p class="lede">${tx(subValue, lang)}</p>` : ""}
      </div>
    </section>`;
}

/* --- home --------------------------------------------------------------- */

function homePage(lang) {
  const h = home;

  const audienceItems = h.audience.items
    .map(
      (a) => `<li class="qualifier" data-reveal>
            <span class="qualifier__mark" aria-hidden="true">${icons.check}</span>
            <span>${tx(a, lang)}</span>
          </li>`
    )
    .join("\n          ");

  const steps = h.howItWorks.steps
    .map(
      (s, i) => `<li class="step" data-reveal>
            <span class="step__num" aria-hidden="true">${i + 1}</span>
            <h3>${tx(s.title, lang)}</h3>
            <p>${tx(s.body, lang)}</p>
          </li>`
    )
    .join("\n          ");

  // Doubled so the CSS translateX(-50%) loop is seamless.
  const marqueeItems = [...h.marquee, ...h.marquee]
    .map(
      (m) =>
        `<span class="marquee__item">${tx(
          m,
          lang
        )}</span><span class="marquee__dot"></span>`
    )
    .join("\n          ");

  const compareRows = h.problem.rows
    .map(
      (r) => `<div class="compare__row" data-reveal>
            <p class="compare__cell compare__cell--before">${tx(r.p, lang)}</p>
            <span class="compare__arrow" aria-hidden="true">${icons.arrow}</span>
            <p class="compare__cell compare__cell--after">${tx(r.s, lang)}</p>
          </div>`
    )
    .join("\n          ");

  const featureCards = h.features.items
    .map(
      (f) => `<article class="card" data-reveal>
            <span class="card__badge" aria-hidden="true">${esc(f.badge)}</span>
            <h3>${tx(f.title, lang)}</h3>
            <p>${tx(f.desc, lang)}</p>
          </article>`
    )
    .join("\n          ");

  const sellerRows = h.sellers.items
    .map((s) => {
      const cls =
        s.rank === 1 ? " seller--top" : s.rank <= 3 ? " seller--medal" : "";
      return `<li class="seller${cls}" data-reveal>
            <span class="seller__rank" aria-hidden="true">${s.rank}</span>
            <img class="seller__img" src="${asset(s.img, lang)}" alt="" width="44" height="44" loading="lazy" decoding="async">
            <span class="seller__info">
              <span class="seller__name">${tx(s.name, lang)}</span>
              <span class="seller__bar"><i style="width:${s.pct}%"></i></span>
            </span>
            <span class="seller__num">
              <span class="seller__amount">${esc(s.amount)} ${tx(
        h.sellers.cur,
        lang
      )}</span>
              <span class="seller__pcs">${s.pcs} ${tx(h.sellers.pcs, lang)}</span>
            </span>
          </li>`;
    })
    .join("\n          ");

  const metricCards = h.analytics.cards
    .map(
      (c) => `<article class="metric" data-reveal>
            <p class="metric__label">${tx(c.label, lang)}</p>
            <p class="metric__value">${tx(c.value, lang)}</p>
            <p class="metric__foot">
              ${
                c.delta
                  ? `<span class="metric__delta">${icons.up}${esc(c.delta)}</span>`
                  : ""
              }
              <span>${tx(c.sub, lang)}</span>
            </p>
          </article>`
    )
    .join("\n          ");

  const ph = h.showcase.phone;

  return `    <section class="hero">
      <div class="wrap hero__inner">
        <p class="badge-pill">
          <img src="${asset("assets/logo-turq.png", lang)}" alt="" width="15" height="15">
          <span>${tx(h.eyebrow, lang)}</span>
        </p>
        <h1 class="h-display">${tx(h.title, lang)}</h1>
        <p class="lede">${tx(h.sub, lang)}</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="${url("contact", lang)}">${tx(
    h.cta1,
    lang
  )}</a>
          <a class="btn btn--ghost" href="#how">${tx(h.cta2, lang)}</a>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true">
      <div class="marquee__track">
          ${marqueeItems}
      </div>
    </div>

    <section class="section" aria-labelledby="audience-title">
      <div class="wrap wrap--narrow">
        ${sectionHead({
          title: h.audience.title,
          sub: h.audience.sub,
          lang,
          center: true,
          id: "audience-title",
        })}
        <ul class="qualifiers">
          ${audienceItems}
        </ul>
      </div>
    </section>

    <section class="section section--wash" id="how" aria-labelledby="how-title">
      <div class="wrap">
        ${sectionHead({
          title: h.howItWorks.title,
          sub: h.howItWorks.sub,
          lang,
          center: true,
          id: "how-title",
        })}
        <ol class="steps">
          ${steps}
        </ol>
      </div>
    </section>

    <section class="section" aria-labelledby="problem-title">
      <div class="wrap">
        ${sectionHead({
          title: h.problem.title,
          sub: h.problem.sub,
          lang,
          center: true,
          id: "problem-title",
        })}
        <div class="compare__legend" aria-hidden="true">
          <span>${tx(h.problem.beforeLabel, lang)}</span>
          <span></span>
          <span>${tx(h.problem.afterLabel, lang)}</span>
        </div>
        <div class="compare">
          ${compareRows}
        </div>
      </div>
    </section>

    <section class="section section--wash" aria-labelledby="features-title">
      <div class="wrap">
        ${sectionHead({
          title: h.features.title,
          sub: h.features.sub,
          lang,
          center: true,
          id: "features-title",
        })}
        <div class="grid grid--3">
          ${featureCards}
        </div>
        <p class="row-center">
          <a class="link-arrow" href="${url("services", lang)}">${tx(
    h.features.seeAll,
    lang
  )}${icons.arrow}</a>
        </p>
      </div>
    </section>

    <section class="section" aria-labelledby="ai-title">
      <div class="wrap">
        <div class="split">
          <div class="split__text" data-reveal>
            <p class="eyebrow">${tx(h.ai.tag, lang)}</p>
            <h2 class="h-section" id="ai-title">${tx(h.ai.title, lang)}</h2>
            <p class="lede">${tx(h.ai.body, lang)}</p>
            ${checkList(h.ai.points, lang)}
          </div>

          <div class="chat" data-reveal>
            <div class="chat__head">
              <span class="chat__avatar" aria-hidden="true">v</span>
              <span>
                <span class="chat__name">${tx(h.ai.chatName, lang)}</span>
                <span class="chat__status"><span class="chat__dot"></span>${tx(
                  h.ai.chatStatus,
                  lang
                )}</span>
              </span>
            </div>
            <div class="chat__body">
              <p class="bubble bubble--in">${tx(h.ai.msg1, lang)}</p>
              <p class="bubble bubble--out">${tx(h.ai.msg2, lang)}</p>
              <p class="bubble bubble--in">${tx(h.ai.msg3, lang)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--wash" aria-labelledby="showcase-title">
      <div class="wrap">
        <div class="split">
          <div class="split__text" data-reveal>
            <p class="eyebrow">${tx(h.showcase.tag, lang)}</p>
            <h2 class="h-section" id="showcase-title">${tx(
              h.showcase.title,
              lang
            )}</h2>
            <p class="lede">${tx(h.showcase.body, lang)}</p>
            ${checkList(h.showcase.points, lang)}
          </div>

          ${
            h.showcase.screenshot
              ? `<img class="phone-shot" src="${asset(
                  h.showcase.screenshot,
                  lang
                )}" alt="${tx(
                  h.showcase.screenshotAlt,
                  lang
                )}" loading="lazy" decoding="async" data-reveal>`
              : `<div class="phone" data-reveal>
            <div class="phone__screen">
              <div class="phone__bar"><span>12:48</span><span>83%</span></div>
              <p class="phone__title">${tx(ph.header, lang)}</p>
              <p class="phone__alert">${tx(ph.attention, lang)}</p>
              <p class="stat-tile__sub">${tx(ph.dateRange, lang)}</p>

              <div class="stat-tile">
                <span class="stat-tile__label">${tx(ph.netLabel, lang)}</span>
                <span class="stat-tile__value">${esc(ph.netValue)} ${tx(
    ph.cur,
    lang
  )}</span>
                <span class="stat-tile__sub">${tx(ph.returned, lang)}</span>
              </div>

              <div class="phone__pair">
                <div class="stat-tile">
                  <span class="stat-tile__label">${tx(ph.avgLabel, lang)}</span>
                  <span class="stat-tile__value">${esc(ph.avgValue)}</span>
                </div>
                <div class="stat-tile">
                  <span class="stat-tile__label">${tx(
                    ph.ordersLabel,
                    lang
                  )}</span>
                  <span class="stat-tile__value">${esc(ph.ordersValue)}</span>
                </div>
              </div>
              <p class="stat-tile__sub">${tx(ph.ordersSub, lang)}</p>

              <div class="stat-tile">
                <span class="stat-tile__label">${esc(ph.waLabel)}</span>
                <span class="stat-tile__sub">${tx(ph.waRead, lang)}</span>
              </div>
            </div>
          </div>`
          }
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="sellers-title">
      <div class="wrap">
        ${sectionHead({
          title: h.sellers.title,
          sub: h.sellers.sub,
          lang,
          id: "sellers-title",
        })}
        <ul class="sellers">
          ${sellerRows}
        </ul>
      </div>
    </section>

    <section class="section section--wash" aria-labelledby="analytics-title">
      <div class="wrap">
        ${sectionHead({
          eyebrow: h.analytics.tag,
          title: h.analytics.title,
          sub: h.analytics.sub,
          lang,
          id: "analytics-title",
        })}
        <div class="grid grid--3">
          ${metricCards}
        </div>
        <p class="muted row-note">
          <strong class="accent">${tx(h.analytics.topSource, lang)}:</strong>
          ${tx(h.analytics.topSourceVal, lang)}
        </p>
      </div>
    </section>

${plansSection(lang)}

${ctaBand(lang)}`;
}

/* --- about -------------------------------------------------------------- */

function aboutPage(lang) {
  const cards = about.cards
    .map(
      (c) => `<article class="card" data-reveal>
            <h3>${tx(c.title, lang)}</h3>
            <p>${tx(c.body, lang)}</p>
          </article>`
    )
    .join("\n          ");

  const why = about.whyItems
    .map((w) => `<li>${tx(w, lang)}</li>`)
    .join("\n          ");

  return `${pageHero(about.title, about.pitch, lang)}

    <section class="section--tight">
      <div class="wrap">
        <div class="grid grid--2">
          ${cards}
        </div>
      </div>
    </section>

    <section class="section section--wash" aria-labelledby="why-title">
      <div class="wrap">
        ${sectionHead({ title: about.whyTitle, lang, id: "why-title" })}
        <ul class="numbered">
          ${why}
        </ul>
      </div>
    </section>

${ctaBand(lang)}`;
}

/* --- services ----------------------------------------------------------- */

function servicesPage(lang) {
  const modules = services.modules
    .map(
      (m) => `<article class="card" data-reveal>
            <span class="card__badge" aria-hidden="true">${esc(m.badge)}</span>
            <h3>${tx(m.title, lang)}</h3>
            <p>${tx(m.desc, lang)}</p>
          </article>`
    )
    .join("\n          ");

  return `${pageHero(services.title, services.sub, lang)}

    <section class="section--tight">
      <div class="wrap">
        <div class="grid grid--3">
          ${modules}
        </div>
      </div>
    </section>

${plansSection(lang, { wash: true })}

${ctaBand(lang)}`;
}

/* --- team --------------------------------------------------------------- */

function teamPage(lang) {
  const roles = team.roles
    .map(
      (r) => `<article class="role" data-reveal>
            <span class="role__initial" aria-hidden="true">${esc(
              r.initial
            )}</span>
            <span>
              <h3>${tx(r.name, lang)}</h3>
              <p class="muted">${tx(r.desc, lang)}</p>
            </span>
          </article>`
    )
    .join("\n          ");

  return `${pageHero(team.title, team.sub, lang)}

    <section class="section--tight">
      <div class="wrap">
        <div class="grid grid--2">
          ${roles}
        </div>
      </div>
    </section>

${ctaBand(lang)}`;
}

/* --- contact ------------------------------------------------------------ */

function contactPage(lang) {
  const c = contact;
  const field = (name, type, labelValue, required) => {
    const label = tx(labelValue, lang);
    const req = required ? " required" : "";
    const reqMark = required
      ? ` <span aria-hidden="true" class="accent">*</span>`
      : "";
    if (type === "textarea") {
      return `<p class="field">
            <label for="f-${name}">${label}${reqMark}</label>
            <textarea id="f-${name}" name="${name}" rows="5" placeholder="${label}"${req}></textarea>
          </p>`;
    }
    return `<p class="field">
            <label for="f-${name}">${label}${reqMark}</label>
            <input id="f-${name}" name="${name}" type="${type}" placeholder="${label}" autocomplete="${
      name === "name" ? "name" : name === "phone" ? "tel" : "organization"
    }"${req}>
          </p>`;
  };

  return `${pageHero(c.title, c.body, lang)}

    <section class="section--tight">
      <div class="wrap">
        <div class="contact-grid">
          <dl class="contact-list" data-reveal>
            <div>
              <dt>${tx(c.emailLabel, lang)}</dt>
              <dd><a href="mailto:${site.email}">${site.email}</a></dd>
            </div>
            <div>
              <dt>${tx(c.whatsappLabel, lang)}</dt>
              <dd><a href="${site.whatsappHref}" target="_blank" rel="noopener"><bdi>${
    site.whatsapp
  }</bdi></a></dd>
            </div>
            <div>
              <dt>${tx(c.regionLabel, lang)}</dt>
              <dd>${tx(c.regionValue, lang)}</dd>
            </div>
          </dl>

          <div data-reveal>
            <form class="form" data-contact-form data-whatsapp="${site.whatsappHref}" novalidate>
              <h2>${tx(c.formTitle, lang)}</h2>
              ${field("name", "text", c.namePlaceholder, true)}
              ${field("phone", "tel", c.phonePlaceholder, true)}
              ${field("company", "text", c.companyPlaceholder, false)}
              ${field("message", "textarea", c.messagePlaceholder, false)}
              <button class="btn btn--primary" type="submit" data-submit-label="${tx(
                c.submit,
                lang
              )}" data-sending-label="${tx(c.sending, lang)}">${tx(
    c.submit,
    lang
  )}</button>
              <span class="form__note">${tx(c.fallbackNote, lang)} —
                <a href="${site.whatsappHref}" target="_blank" rel="noopener"><bdi>${
    site.whatsapp
  }</bdi></a>
              </span>
            </form>

            <div class="form-success" data-form-success hidden>
              <h2>${tx(c.successTitle, lang)}</h2>
              <p class="muted">${tx(c.successBody, lang)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

/* --- registry ----------------------------------------------------------- */

export const renderers = {
  home: homePage,
  about: aboutPage,
  services: servicesPage,
  team: teamPage,
  contact: contactPage,
};
