import { defineConfig } from 'vitepress';

const referenceSidebar = [
  {
    text: 'Overview',
    items: [{ text: 'Reference overview', link: '/reference/' }],
  },
  {
    text: 'Kernel',
    collapsed: false,
    items: [
      { text: 'Kernel', link: '/reference/kernel' },
      { text: 'ConsoleKernelLogger', link: '/reference/console-kernel-logger' },
      { text: 'DependencyInjection', link: '/reference/dependency-injection' },
    ],
  },
  {
    text: 'Contracts And Domain',
    collapsed: false,
    items: [
      { text: 'AggregateRoot', link: '/reference/aggregate-root' },
      { text: 'DomainEvent', link: '/reference/domain-event' },
      { text: 'DomainEventConsumer', link: '/reference/domain-event-consumer' },
      {
        text: 'DomainEventPublisher',
        link: '/reference/domain-event-publisher',
      },
    ],
  },
  {
    text: 'Pub/Sub',
    collapsed: false,
    items: [
      { text: 'Consumer', link: '/reference/consumer' },
      {
        text: 'AmqpMessageBusAdapter',
        link: '/reference/amqp-message-bus-adapter',
      },
      { text: 'InMemoryPubSub', link: '/reference/in-memory-pub-sub' },
    ],
  },
  {
    text: 'DB',
    collapsed: false,
    items: [
      { text: 'InMemoryRepository', link: '/reference/in-memory-repository' },
      { text: 'MongoRepository', link: '/reference/mongo-repository' },
    ],
  },
  {
    text: 'UI',
    collapsed: false,
    items: [
      { text: 'ExpressKernelServer', link: '/reference/express-kernel-server' },
      { text: 'Route', link: '/reference/route' },
    ],
  },
  {
    text: 'Scheduling',
    collapsed: false,
    items: [{ text: 'Scheduler', link: '/reference/scheduler' }],
  },
  {
    text: 'Logs',
    collapsed: false,
    items: [{ text: 'WinstonLogger', link: '/reference/winston-logger' }],
  },
  {
    text: 'WebSocket',
    collapsed: false,
    items: [
      { text: 'WebSocketEventHub', link: '/reference/web-socket-event-hub' },
      {
        text: 'WebSocketRealtimeServer',
        link: '/reference/web-socket-realtime-server',
      },
    ],
  },
];

const gettingStartedSidebar = [
  {
    text: 'Getting started',
    items: [
      { text: 'Introduction', link: '/getting-started/introduction' },
      { text: 'Package map', link: '/getting-started/package-map' },
      { text: 'Installation', link: '/getting-started/installation' },
      {
        text: 'Application startup',
        link: '/getting-started/application-startup',
      },
    ],
  },
];

const guideSidebar = [
  {
    text: 'Guides',
    items: [
      {
        text: 'Dependency injection',
        link: '/guides/dependency-injection',
      },
      { text: 'Adapters', link: '/guides/adapters' },
      { text: 'AMQP pub/sub', link: '/guides/amqp-pubsub' },
      { text: 'HTTP routes', link: '/guides/http-routes' },
    ],
  },
];

export default defineConfig({
  lang: 'en-US',
  title: 'DDD Kernel',
  description: 'Documentation for @haskou/ddd-kernel.',
  base: '/ddd-kernel/',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#3f6ee8' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'DDD Kernel' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Documentation for @haskou/ddd-kernel.',
      },
    ],
  ],

  themeConfig: {
    siteTitle: 'DDD Kernel',

    nav: [
      { text: 'Getting Started', link: '/getting-started/introduction' },
      { text: 'Guide', link: '/guides/dependency-injection' },
      { text: 'Reference', link: '/reference/' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/@haskou/ddd-kernel',
      },
    ],

    sidebar: {
      '/getting-started/': gettingStartedSidebar,
      '/guides/': guideSidebar,
      '/reference/': referenceSidebar,
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/haskou/ddd-kernel' },
    ],

    outline: {
      level: [2, 3],
      label: 'On this page',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/haskou/ddd-kernel/edit/master/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Haskou',
    },
  },
});
