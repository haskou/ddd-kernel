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
    text: 'Domain',
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
    text: 'Adapters',
    collapsed: false,
    items: [
      { text: 'Consumer', link: '/reference/consumer' },
      {
        text: 'AmqpMessageBusAdapter',
        link: '/reference/amqp-message-bus-adapter',
      },
      { text: 'InMemoryPubSub', link: '/reference/in-memory-pub-sub' },
      { text: 'InMemoryRepository', link: '/reference/in-memory-repository' },
      { text: 'MongoRepository', link: '/reference/mongo-repository' },
      { text: 'ExpressKernelServer', link: '/reference/express-kernel-server' },
      { text: 'Route', link: '/reference/route' },
      { text: 'Scheduler', link: '/reference/scheduler' },
      { text: 'WinstonLogger', link: '/reference/winston-logger' },
      { text: 'WebSocketEventHub', link: '/reference/web-socket-event-hub' },
      {
        text: 'WebSocketRealtimeServer',
        link: '/reference/web-socket-realtime-server',
      },
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
      { text: 'Guide', link: '/getting-started/introduction' },
      { text: 'Adapters', link: '/guides/adapters' },
      { text: 'Reference', link: '/reference/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting started',
          items: [
            { text: 'Introduction', link: '/getting-started/introduction' },
            { text: 'Installation', link: '/getting-started/installation' },
            {
              text: 'Application startup',
              link: '/getting-started/application-startup',
            },
          ],
        },
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
      ],
      '/guides/': [
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
        ...referenceSidebar,
      ],
      '/reference/': referenceSidebar,
    },

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
