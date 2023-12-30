import type { Config } from '@docusaurus/types';

import { themes } from 'prism-react-renderer';

const organizationName = 'tiddly-gittly';
const projectName = 'git-sync-js';

export default {
  title: 'Git-Sync-JS Docs',
  tagline: 'API and usage or git-sync-js npm package.',
  url: `https://${organizationName}.github.io`,
  baseUrl: `/${projectName}/`,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: 'favicon.ico',
  // GitHub Pages adds a trailing slash by default that I don't want
  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName, // Usually your GitHub org/user name.
  projectName, // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: `https://github.com/${organizationName}/${projectName}/tree/master/docs/`,
          routeBasePath: '/',
        },
        theme: {
          // customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Git-Sync-JS Docs',
        logo: {
          alt: 'Logo',
          // temporary logo, change this when we have a real one
          // it will try to load `static/images/Logo.png` if provided `"/images/Logo.png"`.
          src: '/images/Logo.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'README',
            position: 'left',
            label: 'README',
          },
          { to: 'api', label: 'API', position: 'left' },
          {
            href: `https://github.com/${organizationName}/${projectName}`,
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'README',
                to: 'README',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/git-sync-js',
              },
              {
                label: 'Discord',
                href: 'https://discordapp.com/invite/git-sync-js',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/git-sync-js',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'API',
                to: 'api',
              },
              {
                label: 'GitHub',
                href: `https://github.com/${organizationName}/${projectName}`,
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} ${organizationName}. Doc site built with Docusaurus.`,
      },
      prism: {
        theme: themes.vsLight,
        darkTheme: themes.vsDark,
      },
    }),
} satisfies Config;
