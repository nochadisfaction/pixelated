declare module 'virtual:vitesse/user-config' {
  const Config: import('./types').VitesseConfig
  export default Config
}

declare module 'virtual:vitesse/plugin-translations' {
  const PluginTranslations: import('./utils/plugins').PluginTranslations
  export default PluginTranslations
}
