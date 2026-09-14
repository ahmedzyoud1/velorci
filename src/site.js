/* velorci — progressive enhancement only.
   Every page is fully readable and navigable with this file blocked. */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* --- mobile menu ------------------------------------------------------ */

  var header = document.getElementById("site-header");
  var toggle = document.querySelector("[data-menu-toggle]");

  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close on Escape so keyboard users are never trapped in the panel.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* --- reveal on scroll ------------------------------------------------- */

  var revealTargets = document.querySelectorAll("[data-reveal]");
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealAll() {
    for (var i = 0; i < revealTargets.length; i++) {
      revealTargets[i].classList.add("is-visible");
    }
  }

  if (!revealTargets.length) {
    // nothing to do
  } else if (reduced || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });

    // Failsafe: this animation must never be the reason content stays
    // invisible. If anything is still hidden a few seconds in — an observer
    // that never fired, a print job, a screenshot tool, a page restored from
    // bfcache — show everything unconditionally.
    setTimeout(revealAll, 3000);
    window.addEventListener("beforeprint", revealAll);
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) revealAll();
    });
  }

  /* --- contact form ------------------------------------------------------
     There is no backend on this static site. Rather than showing a fake
     "sent" message, the form hands the enquiry to WhatsApp with the fields
     pre-filled, then shows the confirmation panel.
     ---------------------------------------------------------------------- */

  var form = document.querySelector("[data-contact-form]");
  var success = document.querySelector("[data-form-success]");

  if (form && success) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var company = (data.get("company") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      // Minimal validation: name and phone are the two fields we need back.
      var firstInvalid = null;
      if (!name) firstInvalid = form.querySelector("#f-name");
      else if (!phone) firstInvalid = form.querySelector("#f-phone");

      if (firstInvalid) {
        firstInvalid.setAttribute("aria-invalid", "true");
        firstInvalid.focus();
        return;
      }

      form.querySelectorAll("[aria-invalid]").forEach(function (el) {
        el.removeAttribute("aria-invalid");
      });

      var button = form.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
        button.textContent =
          button.getAttribute("data-sending-label") || button.textContent;
      }

      var lines = [name, phone];
      if (company) lines.push(company);
      if (message) lines.push(message);

      var target = form.getAttribute("data-whatsapp");
      if (target) {
        window.open(
          target + "?text=" + encodeURIComponent(lines.join("\n")),
          "_blank",
          "noopener"
        );
      }

      form.hidden = true;
      success.hidden = false;
      success.setAttribute("tabindex", "-1");
      success.focus();
    });
  }
})();
