/**
 * This namespace is reserved for Vitesse (only used for i18n at the moment).
 * It can be extended by plugins using module augmentation and interface merging.
 */
declare namespace VitesseApp {
  interface I18n {}
}

/**
 * Extending Astro’s `App.Locals` interface registers types for the middleware added by Vitesse.
 */
declare namespace App {
  interface Locals {
    t: import('./utils/create-translation-system').I18nT
  }
}
