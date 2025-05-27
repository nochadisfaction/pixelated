// @ts-check
import { defineConfig } from 'astro/config'

import vitesse from 'astro-vitesse'
import UnoCSS from 'unocss/astro'

// https://astro.build/config
export default defineConfig({
  site: 'https://astro-vitesse.vercel.app',
  integrations: [
    UnoCSS(),
    vitesse({
      title: 'Astro Vitesse',
      credits: true,
      logo: {
        light: '/src/assets/logo-light.svg',
        dark: '/src/assets/logo-dark.svg',
        alt: 'Astro Vitesse Logo',
      },
      defaultLocale: 'root',
      locales: {
        root: {
          lang: 'en',
          label: 'English',
        },
        es: {
          lang: 'es',
          label: 'Español',
        },
      },
      components: {
        Footer: '/src/components/Footer.astro',
      },
      social: {
        twitter: 'https://twitter.com/adrianub',
        github: 'https://github.com/adrian-ub/astro-vitesse',
        mastodon: 'https://mastodon.social/@adrianub',
      },
      navBar: [{
        label: 'Blog',
        slug: 'posts',
        icon: 'i-ri-article-line',
        labelClass: 'lt-md:hidden',
        iconClass: 'md:hidden',
        translations: {
          es: 'Publicaciones',
        },
      }, {
        label: 'Projects',
        slug: 'projects',
        icon: 'i-ri-lightbulb-line',
        labelClass: 'lt-md:hidden',
        iconClass: 'md:hidden',
      }, {
        label: 'Talks',
        slug: 'talks',
        wrapperClass: 'lt-md:hidden',
      }, {
        label: 'Sponsors',
        slug: 'sponsors-list',
        icon: 'i-ri-heart-line',
        labelClass: 'lt-md:hidden',
        iconClass: 'md:hidden',
      }, {
        label: 'Podcasts',
        slug: 'podcasts',
        icon: 'i-ri-mic-line',
        hideLabel: true,
        wrapperClass: 'lt-md:hidden',
      },
      // {
      //   label: 'Demos',
      //   slug: 'demos',
      //   icon: 'i-ri-screenshot-line',
      //   hideLabel: true,
      // },
      // {
      //   label: 'Let\'s Chat',
      //   slug: 'chat',
      //   icon: 'i-ri-chat-1-line',
      //   hideLabel: true,
      // }
      {
        label: 'Twitter',
        link: 'https://twitter.com/adrianub',
        hideLabel: true,
        icon: 'i-ri-twitter-x-fill',
        wrapperClass: 'lt-md:hidden',
        attrs: {
          target: '_blank',
          rel: 'noopener',
        },
      }, {
        label: 'GitHub',
        link: 'https://github.com/adrian-ub/astro-vitesse',
        hideLabel: true,
        icon: 'i-uil-github-alt',
        wrapperClass: 'lt-md:hidden',
        attrs: {
          target: '_blank',
          rel: 'noopener',
        },
      }, {
        label: 'RSS',
        link: '/feed.xml',
        hideLabel: true,
        icon: 'i-la-rss-square',
        wrapperClass: 'lt-md:hidden',
        attrs: {
          target: '_blank',
          rel: 'noopener',
          style: 'font-size:1.25rem; margin: 0 -0.125rem;',
        },
      }],
      subNavBar: [
        {
          label: 'Blog',
          slug: 'posts',
        },
        {
          label: 'Talks',
          slug: 'talks',
          translations: {
            es: 'Charlas',
          },
        },
        {
          label: 'Podcasts',
          slug: 'podcasts',
        },
        {
          label: 'Streams',
          slug: 'streams',
        },
        {
          label: 'Notes',
          slug: 'notes',
        },
      ],
    }),
  ],
})
