/**
 * Seed content fixtures — the approved page copy and block layout from the
 * signed-off mockups.
 *
 * Deliberately free of any database import so the same fixtures can be used by
 * the seed script, by tests, and by a mock content server during local
 * verification.
 */
import type { Block } from '@onsys/shared';
import { org } from '../lib/env';

/**
 * Mirrors the messaging on onsys.com.au — the "Expert IT Services You Can
 * Trust" hero, the eight service pillars from the tabbed section, the six
 * "Why Onsys Technologies?" reasons and the free-consultation offer.
 *
 * Claims (up to 50% cost reduction, 250+ certified experts, the 2025 awards)
 * are Onsys's own, lifted verbatim from the live site rather than invented.
 */
const homeBlocks: Block[] = [
  {
    type: 'hero',
    eyebrow: '24/7 IT & database support · Melbourne & Colombo',
    heading: 'Expert IT services',
    highlight: 'you can trust.',
    body: 'Smart, affordable solutions designed to accelerate your business — remote DBA cover, managed IT, cloud migration, AI and custom software, delivered by one accountable team around the clock.',
    videoUrl: 'https://www.youtube-nocookie.com/embed/HqalUFAJFgE',
    ctas: [
      { label: 'Schedule a Meeting', href: '/contact' },
      { label: 'Discover Onsys IT Services', href: '/expertise' },
    ],
  },
  {
    type: 'quicklinks',
    items: [
      { label: 'Remote DBA', href: '/managed-database-services', icon: '#s-managed', color: '#EAF1FB' },
      { label: 'Managed IT', href: '/expertise', icon: '#s-consult', color: '#E7F5EC' },
      { label: 'Cloud & Migration', href: '/expertise', icon: '#s-cloud', color: '#FFF1E0' },
      { label: 'Fixed-Price Projects', href: '/pricing-and-plans', icon: '#s-ha', color: '#EAF1FB' },
      { label: 'Software & AI', href: '/expertise', icon: '#s-code', color: '#E7F5EC' },
      { label: 'Cyber Security', href: '/expertise', icon: '#s-shield', color: '#FFF1E0' },
    ],
  },
  {
    type: 'stats',
    eyebrow: 'Why teams move to Onsys',
    heading: 'Enterprise-grade cover, without the enterprise headcount',
    stats: [
      { value: 'Up to 50%', label: 'Lower DBA & IT operating cost' },
      { value: '24/7', label: 'Monitoring, support and on-call cover' },
      { value: '250+', label: 'Certified experts available on demand' },
      { value: '2', label: 'Delivery hubs — Melbourne & Colombo' },
    ],
  },
  {
    type: 'cardGrid',
    eyebrow: 'What we do',
    heading: 'Partner with Onsys for reliable, scalable and cost-effective IT',
    body: 'Trusted, cost-effective solutions from consultancy and managed IT services through to full-scale software development — one supplier, one accountable team.',
    centered: true,
    altBackground: true,
    columns: 4,
    cards: [
      {
        title: 'Remote DBA Support',
        body: 'Round-the-clock monitoring and proactive support that resolves issues before they hit your business, across SQL Server, Oracle, PostgreSQL, MySQL, Azure SQL and MongoDB.',
        icon: '#s-managed',
        coverColor: '#EAF1FB',
        tag: 'From $1,500/mo',
        link: { label: 'See plans', href: '/pricing-and-plans' },
      },
      {
        title: 'Fixed-Price Database Projects',
        body: 'Migrations, upgrades and HA builds on milestone-based payments. Know exactly what you will pay — no overruns, no hidden costs, guaranteed timelines.',
        icon: '#s-ha',
        coverColor: '#FFF1E0',
        tag: 'Milestone-based',
        link: { label: 'How it works', href: '/pricing-and-plans' },
      },
      {
        title: '24/7 Managed IT Services',
        body: 'End-to-end management across infrastructure, cloud, networks, security and applications — backed by NOC and SOC teams and outcome-driven SLAs.',
        icon: '#s-consult',
        coverColor: '#E7F5EC',
        tag: 'NOC + SOC',
        link: { label: 'Managed IT plans', href: '/managed-it-services' },
      },
      {
        title: 'Cloud Consultancy & Support',
        body: 'Design, migrate and optimise across Azure, AWS and Oracle Cloud — zero-downtime migration, security built into every layer, DevOps and automation.',
        icon: '#s-cloud',
        coverColor: '#F3F2F1',
        tag: 'Azure · AWS · OCI',
        link: { label: 'Learn more', href: '/expertise' },
      },
      {
        title: 'Artificial Intelligence',
        body: 'Automate workflows and accelerate decisions with AI agents, document processing, advanced analytics and generative AI — delivered cloud-native and secure.',
        icon: '#s-code',
        coverColor: '#EAF1FB',
        tag: 'AI & automation',
        link: { label: 'Learn more', href: '/expertise' },
      },
      {
        title: 'Custom Software Development',
        body: 'Tailored applications built by offshore talent under Australian project leadership, on fixed-cost, milestone or dedicated-team engagements.',
        icon: '#s-etl',
        coverColor: '#FFF1E0',
        tag: 'Fixed-cost options',
        link: { label: 'Learn more', href: '/expertise' },
      },
      {
        title: 'Mobile App Development',
        body: 'High-performance iOS, Android, Flutter and React Native apps — ideation, UI/UX, build, QA, launch and ongoing support under one engagement.',
        icon: '#s-emergency',
        coverColor: '#E7F5EC',
        tag: 'iOS · Android',
        link: { label: 'Learn more', href: '/expertise' },
      },
      {
        title: 'Cyber Security Services',
        body: 'Managed security services and managed EDR with real-time threat detection, SIEM optimisation and rapid incident response.',
        icon: '#s-shield',
        coverColor: '#F3F2F1',
        tag: 'Managed EDR',
        link: { label: 'Learn more', href: '/expertise' },
      },
    ],
  },
  {
    type: 'cardGrid',
    eyebrow: 'Why Onsys Technologies?',
    heading: 'One partner accountable for the whole stack',
    centered: true,
    altBackground: false,
    columns: 3,
    cards: [
      { title: 'End-to-end technology expertise', body: 'Database services, managed IT, cloud migration, cyber security, software development, AI and mobile apps — integrated solutions delivered under one roof.' },
      { title: '24/7 availability and support', body: 'Always-on monitoring and on-call support that minimises downtime, improves availability and drives rapid incident resolution.' },
      { title: 'Proven enterprise-grade delivery', body: 'Deep experience across SQL Server, Oracle, PostgreSQL, MySQL, Azure, AWS and OCI, keeping mission-critical systems secure and reliable.' },
      { title: 'Innovation with AI and cloud', body: 'AI-driven SaaS products, automation and cloud-native solutions that help customers modernise and stay competitive.' },
      { title: 'Flexible engagement models', body: 'Fixed-price projects, remote DBA plans, managed services or offshore development teams — budget predictability with room to scale.' },
      { title: 'Customer-centric approach', body: 'Offshore capability with local accountability: up to 50% savings on DBA and IT operations while keeping enterprise-level service quality.' },
    ],
  },
  {
    type: 'platformChips',
    eyebrow: 'Supported technologies',
    heading: 'The platforms we keep running',
    body: 'Two decades of production estates across database, operating system and cloud platforms — on-premises, hybrid or fully cloud-native.',
    groups: [
      {
        title: 'Database platforms',
        chips: [
          { label: 'Oracle 10g – 23ai', color: '#C74634' },
          { label: 'SQL Server 2000 – 2022', color: '#CC2927' },
          { label: 'Azure SQL & MI', color: '#0078D4' },
          { label: 'PostgreSQL & EDB', color: '#336791' },
          { label: 'MySQL & MariaDB', color: '#00758F' },
          { label: 'MongoDB', color: '#13AA52' },
        ],
      },
      {
        title: 'High availability & tooling',
        chips: [
          { label: 'RAC · Data Guard · OEM', color: '#C74634' },
          { label: 'ASM · RMAN · Audit Vault', color: '#8A5A44' },
          { label: 'AlwaysOn · Replication', color: '#CC2927' },
          { label: 'Mirroring · Log shipping', color: '#A4373A' },
          { label: 'TDE · Compression · Backups', color: '#605E5C' },
          { label: 'SSRS · SSIS · SSAS · MDS', color: '#0E336A' },
        ],
      },
      {
        title: 'Cloud & operating systems',
        chips: [
          { label: 'Microsoft Azure', color: '#0078D4' },
          { label: 'AWS', color: '#FF9900' },
          { label: 'Oracle Cloud (OCI)', color: '#C74634' },
          { label: 'Windows Server 2012 – 2022', color: '#00A4EF' },
          { label: 'Linux (RHEL · Ubuntu)', color: '#EE0000' },
          { label: 'Solaris · AIX · HP-UX', color: '#605E5C' },
        ],
      },
    ],
    sidebar: {
      title: 'Recognised work',
      items: [
        'BRONZE Winner — National Best Quality Software Awards (NBQSA) 2025',
        'Second Runner-up — APICTA 2025',
        'Both awarded to OnsysConnect, our digital data-sharing platform',
      ],
    },
  },
  {
    type: 'checkList',
    eyebrow: 'Free consultation',
    heading: 'Talk to an Onsys expert',
    body: "Speak with a senior database consultant at no cost. Let's explore how we can help you:",
    items: [
      'Boost database reliability and uptime',
      'Accelerate performance with expert tuning',
      'Eliminate staffing overhead with remote DBA support',
      'Cut IT operating costs without losing enterprise-grade quality',
    ],
    sidebar: {
      title: 'What the call covers',
      rows: [
        { label: 'Duration', value: '30 minutes' },
        { label: 'Cost', value: 'Free, no obligation' },
        { label: 'You speak to', value: 'A senior consultant' },
        { label: 'You walk away with', value: 'A risk review & recommended plan' },
      ],
    },
  },
  {
    type: 'ctaBand',
    heading: 'Focus on growth, not downtime.',
    body: 'Onsys delivers reliable, cost-effective IT support, consultancy and managed solutions — so your team can get on with the business.',
    cta: { label: 'Schedule a Free Consultation', href: '/contact' },
  },
];

const mdsBlocks: Block[] = [
  {
    type: 'checkList',
    eyebrow: 'Overview',
    heading: "What's included",
    body: 'Every managed plan is built around proactive monitoring and a guaranteed response time, so problems are caught before they become outages.',
    items: [
      '24/7 proactive monitoring & alerting',
      '2-hour guaranteed incident response SLA',
      'Secured remote access to your environment',
      'Monthly database health checks',
      'ITIL-aligned service delivery model',
      'Dedicated professional hours every month',
      'Certified senior DBA expertise',
      'Platform patching & upgrade support',
      'Service desk access',
      'Ad-hoc work billed in 30-minute increments',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Response SLA', value: '2 hours' },
        { label: 'Coverage', value: '24 / 7 / 365' },
        { label: 'Delivery model', value: 'ITIL-aligned' },
        { label: 'Platforms', value: 'SQL Server · Oracle · PostgreSQL · EDB' },
        { label: 'Ad-hoc rate', value: '$140/hr (30-min increments)' },
        { label: 'Regions', value: 'Melbourne + Colombo follow-the-sun' },
      ],
    },
  },
  {
    type: 'steps',
    eyebrow: 'How it works',
    heading: 'From first call to full coverage',
    steps: [
      { title: 'Free consultation', body: 'A senior consultant assesses your current environment and risk areas — no obligation.' },
      { title: 'Onboarding & health check', body: 'We baseline every instance and flag anything that needs attention before go-live.' },
      { title: '24/7 coverage begins', body: 'Monitoring, alerting and your SLA response clock start from day one.' },
      { title: 'Monthly reporting', body: 'You get a clear report on health, incidents, hours used and recommended improvements.' },
    ],
  },
  {
    type: 'pricing',
    eyebrow: 'Plans',
    heading: 'Managed service tiers',
    body: 'Two starting tiers, scoped to your instance count and data footprint — every plan is tailored after the free consultation.',
    altBackground: true,
    columns: 2,
    note: 'Plan structure reflects the tiers currently published on onsys.com.au. Exact monthly pricing is quoted after the free environment assessment — final tier names and inclusions should be validated with the Onsys team before this goes live.',
    plans: [
      {
        name: 'Essentials',
        price: 'Custom quote · scoped to your environment',
        featured: false,
        features: [
          'Up to 10 SQL Server / database instances',
          'Up to 5TB managed data',
          '24/7 monitoring & support',
          '2-hour response SLA',
          '10 professional hours / month',
          'Monthly health check',
          'Ad-hoc work at $140/hr (30-min increments)',
        ],
        cta: { label: 'Request this plan', href: '/contact' },
      },
      {
        name: 'Enterprise',
        price: 'Custom quote · larger & multi-platform estates',
        featured: true,
        badge: 'Most flexible',
        features: [
          'Instance count & data volume scoped to you',
          '24/7 monitoring & priority support',
          'Faster response SLA available',
          'Expanded professional hours',
          'Multi-platform (SQL Server, Oracle, PostgreSQL, EDB)',
          'Dedicated account contact',
          'Quarterly optimisation review',
        ],
        cta: { label: 'Talk to sales', href: '/contact' },
      },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Talk to a senior database consultant — free',
    body: "30 minutes, no obligation. We'll assess your environment and outline where you're exposed.",
    cta: { label: 'Book Your Free Consultation', href: '/contact' },
  },
];

/**
 * Expertise, rebuilt from onsys.com.au/our-expertise.
 *
 * The live page lists the full technology stack under five headings plus the
 * team's certifications. Those certification badges were hotlinked from third
 * parties on the live site; they are now served from /public/certifications.
 */
const expertiseBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'capability-areas',
    eyebrow: 'Capability areas',
    heading: 'Five practices, one accountable team',
    body: 'Our experienced, certified team designs, builds and manages database, cloud and on-premises infrastructure — with the same engineers available afterwards to run it.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Database technologies', body: 'Proactive monitoring, high availability and DR, upgrades and patching, migrations, performance tuning and architecture design across every major platform.', icon: '#s-managed', coverColor: '#EAF1FB', link: { label: 'Database consultancy', href: '/database-consultancy' } },
      { title: 'Software, reporting & integration', body: 'Custom applications, mobile, web, API and ETL integration, plus reporting and data visualisation in Power BI, SSRS and Grafana.', icon: '#s-code', coverColor: '#E7F5EC' },
      { title: 'Infrastructure services', body: 'Virtualisation, system administration, networking and firewalls, hardware and storage, DevOps tooling and monitoring.', icon: '#s-cloud', coverColor: '#FFF1E0', link: { label: 'See rates', href: '/pricing-and-plans#consultancy-rates' } },
      { title: 'Public cloud', body: 'Strategy, solution design, workload migration and ongoing management across Oracle Cloud, Microsoft Azure and AWS.', icon: '#s-etl', coverColor: '#F3F2F1' },
      { title: 'Cyber security', body: 'Managed security services and managed endpoint detection and response, monitored around the clock by our security operations team.', icon: '#s-shield', coverColor: '#EAF1FB', link: { label: 'Discuss your risk profile', href: '/contact' } },
      { title: 'Products', body: 'Secure data sharing, open-source digital identity and Oracle disaster recovery — software we build and back ourselves.', icon: '#s-consult', coverColor: '#E7F5EC', link: { label: 'See our products', href: '/products' } },
    ],
  },
  {
    type: 'platformChips',
    eyebrow: 'Database technologies',
    heading: 'What we run, migrate and tune',
    body: 'Managed database services are built to proactively monitor, manage and resolve incidents across your whole estate — not just the platform we happen to prefer.',
    groups: [
      {
        title: 'High availability & DR',
        chips: [
          { label: 'Oracle RAC', color: '#C74634' },
          { label: 'Oracle Data Guard', color: '#C74634' },
          { label: 'SQL Server Failover Clustering', color: '#CC2927' },
          { label: 'SQL Server AlwaysOn AG', color: '#CC2927' },
          { label: 'Mirroring & log shipping', color: '#A4373A' },
          { label: 'PostgreSQL replication', color: '#336791' },
          { label: 'MySQL replication', color: '#00758F' },
          { label: 'Dbvisit DR', color: '#0E7C4A' },
        ],
      },
      {
        title: 'Migration & upgrade paths',
        chips: [
          { label: 'Oracle to EDB', color: '#336791' },
          { label: 'Oracle cross-platform', color: '#C74634' },
          { label: 'SQL Server to Azure SQL', color: '#0078D4' },
          { label: 'SQL Server to Azure MI', color: '#0063B1' },
          { label: 'On-premises to AWS', color: '#FF9900' },
          { label: 'On-premises to Azure', color: '#0078D4' },
          { label: 'On-premises to Oracle Cloud', color: '#C74634' },
          { label: 'Service packs, CUs, CPU/PSU', color: '#605E5C' },
        ],
      },
      {
        title: 'Design & optimisation',
        chips: [
          { label: 'Query optimisation', color: '#0E336A' },
          { label: 'Database & table design', color: '#1E529D' },
          { label: 'Security architecture', color: '#0E7C4A' },
          { label: 'Performance tuning', color: '#FF8B00' },
        ],
      },
    ],
    sidebar: {
      title: 'Why senior-only matters',
      items: [
        'Every engagement is staffed by certified specialists, not first-line triage.',
        'The consultant who assesses your environment is the one who delivers the work.',
        'Vendor-neutral advice — we hold credentials across Oracle, Microsoft, Red Hat and VMware.',
      ],
    },
  },
  {
    type: 'platformChips',
    eyebrow: 'Software, data & infrastructure',
    heading: 'The rest of the stack',
    body: 'We design, develop and maintain custom software, and keep the infrastructure underneath it reliable, secure and efficiently managed.',
    groups: [
      {
        title: 'Application development',
        chips: [
          { label: 'Python · Java · Node · Spring Boot', color: '#0E336A' },
          { label: 'React · Next.js · Angular · TypeScript', color: '#1E529D' },
          { label: 'Flutter · Swift · React Native', color: '#2C8AEB' },
          { label: 'PHP · Laravel · Django · WordPress', color: '#605E5C' },
        ],
      },
      {
        title: 'Integration & reporting',
        chips: [
          { label: 'REST APIs & SOAP', color: '#0E336A' },
          { label: 'SSIS', color: '#CC2927' },
          { label: 'WSO2', color: '#FF8B00' },
          { label: 'Power BI', color: '#F2C811' },
          { label: 'SSRS', color: '#CC2927' },
          { label: 'Grafana', color: '#F46800' },
        ],
      },
      {
        title: 'Infrastructure & DevOps',
        chips: [
          { label: 'Hyper-V · VMware · Oracle Linux KVM', color: '#607078' },
          { label: 'Windows & Linux administration', color: '#00A4EF' },
          { label: 'Cisco · Juniper · Palo Alto · Fortinet · Sophos', color: '#1BA0D7' },
          { label: 'Oracle Database Appliance · Dell', color: '#C74634' },
          { label: 'Jenkins · Docker · Kubernetes · Ansible · Git', color: '#0E7C4A' },
          { label: 'CheckMK · Prometheus · N-able RMM', color: '#FF8B00' },
        ],
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'cloud',
    eyebrow: 'Public cloud',
    heading: 'Every stage of the cloud journey',
    body: 'From strategy through to running it — we help organisations develop a cloud strategy, design the solution, migrate the workload and manage what lands there.',
    items: [
      'Oracle Cloud (OCI) — design solutions, migrate Oracle databases, migrate JD Edwards, deploy cloud-native applications',
      'Microsoft Azure — design and implement, migrate SQL Server, build cloud-native apps, secure with Microsoft Sentinel',
      'Amazon Web Services — migration strategy, seamless migration, application modernisation, automation for efficiency',
      'Google for Business, Microsoft 365 and web hosting for the everyday platform',
    ],
    sidebar: {
      title: 'Engagement routes',
      rows: [
        { label: 'Advisory', value: '$150 / hour' },
        { label: 'Defined scope', value: 'Fixed price' },
        { label: 'Ongoing', value: 'From $1,500 / month' },
        { label: 'First call', value: 'Free' },
      ],
    },
  },
  {
    type: 'logoGrid',
    anchor: 'certifications',
    eyebrow: 'Credentials',
    heading: 'Certifications held by our engineers and consultants',
    body: 'Vendor-neutral advice is only credible if the certifications sit across the vendors. Ours do.',
    altBackground: true,
    note: 'Badges are the property of their respective certification bodies and are shown to indicate credentials held by Onsys engineers.',
    logos: [
      { name: 'Oracle Certified Professional', issuer: 'Oracle', image: '/certifications/oracle-certified-professional.png', alt: 'Oracle Certified Professional badge' },
      { name: 'Oracle Certified Master', issuer: 'Oracle' },
      { name: 'Azure Database Administrator Associate', issuer: 'Microsoft', image: '/certifications/microsoft-certified-associate.svg', alt: 'Microsoft Certified Associate badge' },
      { name: 'Azure Solutions Architect Expert', issuer: 'Microsoft', image: '/certifications/microsoft-certified-expert.svg', alt: 'Microsoft Certified Expert badge' },
      { name: 'Azure Security Engineer Associate', issuer: 'Microsoft', image: '/certifications/microsoft-certified-associate.svg', alt: 'Microsoft Certified Associate badge' },
      { name: 'Azure AI Engineer Associate', issuer: 'Microsoft', image: '/certifications/microsoft-certified-associate.svg', alt: 'Microsoft Certified Associate badge' },
      { name: 'Power BI Data Analyst Associate', issuer: 'Microsoft', image: '/certifications/microsoft-certified-associate.svg', alt: 'Microsoft Certified Associate badge' },
      { name: 'Data Management and Analytics', issuer: 'Microsoft', image: '/certifications/data-management-analytics.png', alt: 'Data Management and Analytics badge' },
      { name: 'Red Hat Certified Engineer', issuer: 'Red Hat', image: '/certifications/redhat-certified-engineer.jpeg', alt: 'Red Hat Certified Engineer badge' },
      { name: 'VMware Certified Professional — DCV', issuer: 'VMware', image: '/certifications/vmware-vcp-dcv.png', alt: 'VMware Certified Professional Data Center Virtualization badge' },
      { name: 'NSE 7 Network Security Architect', issuer: 'Fortinet', image: '/certifications/fortinet-nse-7.png', alt: 'Fortinet NSE 7 Network Security Architect badge' },
    ],
  },
  {
    type: 'steps',
    eyebrow: 'How we work',
    heading: 'Consulting, projects and managed operations',
    steps: [
      { title: 'Assess', body: 'A senior consultant reviews your current environment, architecture and risk areas.' },
      { title: 'Recommend', body: 'You get a clear, vendor-neutral recommendation — not a push toward a particular platform.' },
      { title: 'Deliver', body: 'Certified specialists execute the work, whether that is a migration, a build or ongoing operations.' },
      { title: 'Support', body: 'Many engagements continue into managed support so the improvement is sustained, not one-off.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Talk to a specialist about your platform',
    body: 'Tell us what you run and what is hurting. A certified consultant will come back with an honest assessment — free, and with no obligation.',
    cta: { label: 'Contact Us Now', href: '/contact' },
  },
];

/**
 * About, rebuilt from onsys.com.au/about-us — who we are, what we do, vision,
 * mission, values and the company identifiers. The "what we do" cards link
 * through to the service pages rather than restating them.
 */
const aboutBlocks: Block[] = [
  {
    type: 'checkList',
    anchor: 'who-we-are',
    eyebrow: 'Who we are',
    heading: 'A Melbourne technology partner, not just a supplier',
    body: 'Onsys Technologies helps businesses in Australia and worldwide innovate, digitalise and save money through tailored IT solutions. Our team combines onshore and offshore specialists — global expertise with local insight — to deliver secure, scalable solutions for organisations of any size.',
    items: [
      'Melbourne head office with a delivery centre in Colombo, Sri Lanka',
      'Onshore presence in Australia backed by an offshore expert team',
      'Enterprise-grade engineering at a cost-effective price point',
      'Experience across industries and regions, on complex problems',
      'Certified specialists rather than generalist first-line support',
    ],
    sidebar: {
      title: 'Company information',
      rows: [
        { label: 'Legal name', value: org.legalName },
        { label: 'ABN', value: org.abn },
        { label: 'ACN', value: org.acn },
        { label: 'Head office', value: `${org.address.locality}, ${org.address.region}` },
        { label: 'Delivery centre', value: 'Colombo, Sri Lanka' },
        { label: 'Coverage', value: '24 / 7 / 365' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'what-we-do',
    eyebrow: 'What we do',
    heading: 'More than a service provider — a trusted technology partner',
    body: 'Six ways clients engage us on their database estate, each with a team and an SLA behind it.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Database support & consultancy', body: 'Expert advice to optimise performance, migrate platforms, strengthen disaster recovery and build modern infrastructure.', icon: '#s-consult', coverColor: '#EAF1FB', link: { label: 'Database consultancy', href: '/database-consultancy' } },
      { title: 'Managed database services', body: 'Proactive monitoring, incident management and system optimisation aligned with ITIL service delivery best practice.', icon: '#s-managed', coverColor: '#FFF1E0', link: { label: 'See what is included', href: '/managed-database-services' } },
      { title: 'Ad-hoc DBA support', body: 'On-demand staffing to fill resource gaps, support project rollouts and resolve urgent issues without a permanent hire.', icon: '#s-etl', coverColor: '#E7F5EC', link: { label: 'On-call cover', href: '/on-call-dba-services' } },
      { title: '24×7 remote DBA support', body: 'Around-the-clock access to experienced DBAs, keeping mission-critical databases operational at any hour.', icon: '#s-ha', coverColor: '#F3F2F1', link: { label: 'Compare plans', href: '/pricing-and-plans' } },
      { title: 'Emergency support', body: 'Rapid response to outages with root-cause analysis, to minimise downtime and protect business continuity.', icon: '#s-emergency', coverColor: '#EAF1FB', link: { label: 'Outage response', href: '/emergency-database-support' } },
      { title: 'Project support', body: 'Dedicated experts for solution design, project management and end-to-end implementation on a fixed price.', icon: '#s-code', coverColor: '#E7F5EC', link: { label: 'Fixed-price projects', href: '/pricing-and-plans' } },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'vision-mission',
    eyebrow: 'Where we are going',
    heading: 'Vision and mission',
    centered: true,
    altBackground: false,
    columns: 2,
    cards: [
      {
        title: 'Our vision',
        body: 'To be the most trusted, innovative and customer-centric technology partner — delivering affordable solutions that drive measurable business outcomes.',
        icon: '#s-shield',
        coverColor: '#EAF1FB',
        tag: 'Vision',
      },
      {
        title: 'Our mission',
        body: 'To design and deliver technology services that reduce operational costs, protect critical data, maximise availability, and enable organisations to manage, acquire and operate technology with confidence.',
        icon: '#s-managed',
        coverColor: '#FFF1E0',
        tag: 'Mission',
      },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'values',
    eyebrow: 'Our values',
    heading: 'What guides how we work',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Customer-centric excellence', body: 'Putting client needs first to build long-term partnerships based on trust, not on lock-in.', icon: '#s-consult', coverColor: '#EAF1FB' },
      { title: 'Innovation for impact', body: 'Leveraging emerging technologies to deliver solutions with lasting business value, not novelty.', icon: '#s-code', coverColor: '#FFF1E0' },
      { title: 'Reliability', body: 'Robust, secure and dependable services our clients can trust with mission-critical systems.', icon: '#s-ha', coverColor: '#E7F5EC' },
      { title: 'Collaborative expertise', body: 'Partnering with clients and combining diverse skills, so knowledge stays in your business.', icon: '#s-managed', coverColor: '#F3F2F1' },
      { title: 'Ethical and sustainable practice', body: 'Committing to responsible technology use and minimising our environmental impact.', icon: '#s-shield', coverColor: '#EAF1FB' },
      { title: 'Agility and adaptability', body: 'Staying ahead of industry change so our clients stay future-ready rather than catching up.', icon: '#s-etl', coverColor: '#E7F5EC' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'why-onsys',
    eyebrow: 'Why choose Onsys',
    heading: 'What clients tell us makes the difference',
    body: 'Beyond the database practice we deliver cloud, managed IT, cyber security, software development and AI services — so digital transformation does not need five suppliers.',
    items: [
      'Proven expertise in SQL Server, Oracle, PostgreSQL, MySQL, MongoDB and cloud-native databases',
      'Flexible engagement models — ad-hoc, project-based or fully managed',
      'Global delivery with onshore presence in Australia and an offshore expert team',
      'Commitment to 24/7 availability and rapid issue resolution',
      'A track record of higher uptime, lower cost and stronger security for enterprise clients',
    ],
    sidebar: {
      title: 'Engagement at a glance',
      rows: [
        { label: 'Consultancy', value: '$150 / hour' },
        { label: 'Monthly plans', value: 'From $1,500' },
        { label: 'On-call cover', value: 'From $100 / instance' },
        { label: 'Lock-in contracts', value: 'None' },
        { label: 'First consultation', value: 'Free' },
      ],
    },
  },
  {
    type: 'stats',
    eyebrow: 'By the numbers',
    heading: 'Enterprise-grade cover, without the enterprise headcount',
    stats: [
      { value: 'Up to 50%', label: 'Lower DBA & IT operating cost' },
      { value: '24/7', label: 'Monitoring, support and on-call cover' },
      { value: '250+', label: 'Certified experts available on demand' },
      { value: '2', label: 'Delivery hubs — Melbourne & Colombo' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Looking for a first-class database consultant?',
    body: 'Book a free 30-minute call with a senior consultant. We will give you an honest read on your environment — and tell you if you do not need us.',
    cta: { label: 'Book Now', href: '/contact' },
  },
];

/**
 * Mirrors the published pricing on onsys.com.au/pricing-and-plans.
 *
 * Two editorial changes from the source page: the "GST exclusive" and
 * "$140/hr overage" notes are stated once per section instead of repeated on
 * every card, and the quantitative inclusions are labelled so the plans can be
 * compared down a column. Figures themselves are verbatim.
 */
const pricingBlocks: Block[] = [
  {
    type: 'quicklinks',
    items: [
      { label: 'Database Plans', href: '#database-plans', icon: '#s-managed', color: '#EAF1FB' },
      { label: 'Managed IT (SMB)', href: '#managed-it-plans', icon: '#s-cloud', color: '#FFF1E0' },
      { label: 'Hourly Consultancy', href: '#consultancy-rates', icon: '#s-consult', color: '#E7F5EC' },
      { label: 'Engagement Options', href: '#engagement-options', icon: '#s-etl', color: '#F3F2F1' },
    ],
  },
  {
    type: 'pricing',
    anchor: 'database-plans',
    altBackground: false,
    eyebrow: 'Remote database support',
    heading: 'Monthly DBA plans',
    body: 'Fixed monthly coverage for teams running production databases without an in-house DBA. Every plan includes 24/7 remote support, a guaranteed response SLA and a block of professional service hours.',
    columns: 3,
    note: 'All prices are GST exclusive. Professional service hours beyond the monthly allocation are billed at $140/hr in 30-minute increments, and are always agreed with you before the work starts.',
    plans: [
      {
        name: '24/7 DBA Plan A',
        price: '$1,500',
        unit: 'per month',
        featured: false,
        description: 'For teams running SQL Server without an in-house DBA.',
        featuresTitle: 'Key features',
        features: [
          { label: 'Instances:', text: 'up to 10 SQL Server' },
          { label: 'Data volume:', text: 'up to 5 TB covered' },
          { label: 'Response SLA:', text: '2 hours, guaranteed, 24/7' },
          { label: 'Service hours:', text: '10 professional hours per month' },
          { label: 'Reporting:', text: 'monthly health-check report' },
          { label: 'Platforms:', text: 'SQL Server, Azure SQL & Managed Instance' },
          { label: 'Coverage:', text: 'on-premises, AWS and Azure' },
          'Secure remote access by certified, experienced DBAs',
          'Service desk access at no additional cost',
        ],
        cta: { label: 'Get Started', href: '/contact' },
      },
      {
        name: '24/7 DBA Plan B',
        price: '$3,000',
        unit: 'per month',
        featured: false,
        description:
          'For organisations running critical database infrastructure without an in-house DBA — enterprise-grade support and proactive monitoring that keeps databases fast, secure and always available.',
        featuresTitle: 'Key features',
        features: [
          { label: 'Instances:', text: '10 SQL Server plus 4 MySQL/PostgreSQL' },
          { label: 'Data volume:', text: 'up to 20 TB covered' },
          { label: 'Response SLA:', text: '1 hour, 24/7' },
          { label: 'Service hours:', text: '20 professional hours per month' },
          { label: 'Reporting:', text: 'monthly health-check report' },
          { label: 'Platforms:', text: 'MySQL, EDB, PostgreSQL, SQL Server, Azure SQL & MI' },
          { label: 'Coverage:', text: 'on-premises, AWS and Azure' },
          'Automated alerts and notifications configured for you',
          'Secure remote access by certified database experts',
          'Service desk access at no extra cost',
        ],
        cta: { label: 'Get Started', href: '/contact' },
      },
      {
        name: '24/7 DBA Plan C',
        price: '$7,500',
        unit: 'per month',
        featured: false,
        description:
          'For mission-critical estates that need high availability, proactive monitoring and expert guidance to stay secure, optimised and resilient.',
        featuresTitle: 'Key features',
        features: [
          { label: 'Instances:', text: '25 SQL Server, 4 MySQL/PostgreSQL, 6 Oracle' },
          { label: 'Data volume:', text: 'up to 50 TB covered' },
          { label: 'Response SLA:', text: '1 hour, guaranteed, 24/7' },
          { label: 'Service hours:', text: '50 professional hours per month' },
          { label: 'Reporting:', text: 'daily health-check reports' },
          { label: 'Platforms:', text: 'Oracle, SQL Server, Azure SQL & Managed Instance' },
          { label: 'Coverage:', text: 'on-premises, OCI, AWS and Azure' },
          'Automated database alerts and notifications configured',
          'Secure remote access by certified database experts',
          'Service desk access at no additional cost',
        ],
        cta: { label: 'Get Started', href: '/contact' },
      },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Get a tailored database support plan with an SLA that matches your business needs.',
    body: "If none of the three plans lines up with your estate, we'll build one around your instance count, data volume and response times.",
    cta: { label: 'Build My Custom Plan', href: '/contact' },
  },
  {
    type: 'pricing',
    anchor: 'managed-it-plans',
    altBackground: true,
    eyebrow: 'Managed IT services',
    heading: 'Managed IT for small and medium business',
    body: 'End-to-end IT operations for growing teams — service desk, infrastructure, Microsoft 365, backup and monitoring under a single monthly fee.',
    columns: 3,
    note: 'All prices are GST exclusive. Advanced and Premium are scoped to your user count, site count and device mix, then quoted as a fixed monthly fee.',
    plans: [
      {
        name: 'Basic SMB',
        price: '$4,500',
        unit: 'per month · up to 30 users',
        featured: false,
        description: 'Business-hours cover for a single-site team that needs its IT to simply work.',
        featuresTitle: "What's included",
        features: [
          'Australian business-hours support to keep staff productive',
          { label: 'Tickets:', text: '25 per month, for predictable cost control' },
          { label: 'End-user support:', text: 'Windows 10/11 and macOS troubleshooting' },
          { label: 'Infrastructure:', text: '1 firewall, up to 3 switches, 5 WiFi access points, NAS, SAN, VMware' },
          { label: 'Microsoft 365:', text: 'Exchange Online, OneDrive, Teams' },
          { label: 'Backup:', text: 'infrastructure support or Backup-as-a-Service, up to 500 GB' },
          { label: 'Monitoring:', text: 'reactive, with email alerts (Cacti / Zabbix)' },
          'Offshore support with help desk access',
          'ITSM — SummitAI service desk with end-user access',
        ],
        cta: { label: 'Contact us', href: '/contact' },
      },
      {
        name: 'Advanced SMB',
        price: 'POA',
        unit: 'per month · up to 100 users',
        featured: false,
        description: 'Adds patch management, identity and file services for a growing multi-site business.',
        featuresTitle: "What's included",
        features: [
          'Australian business-hours support with faster resolution',
          { label: 'Tickets:', text: '75 per month' },
          { label: 'End-user support:', text: 'Windows 10/11 and macOS troubleshooting' },
          { label: 'Infrastructure:', text: 'up to 2 firewalls, 5 switches, 10 WiFi APs + controller, NAS, SAN, VMware' },
          { label: 'Microsoft 365:', text: 'Exchange, Teams, OneDrive, Entra ID, Security & Compliance Center' },
          { label: 'File & print:', text: 'up to 2 file servers, 3 network printers' },
          { label: 'Patching:', text: 'laptops, desktops, servers and network equipment' },
          { label: 'Monitoring:', text: '24×7 reactive, with email alerts' },
          'Backup infrastructure support at client and server level',
          'Monthly service management reports',
        ],
        cta: { label: 'Contact us', href: '/contact' },
      },
      {
        name: 'Premium SMB',
        price: 'POA',
        unit: 'per month · up to 200 users',
        featured: false,
        description: 'Round-the-clock cover with proactive monitoring, compliance reporting and quarterly business reviews.',
        featuresTitle: "What's included",
        features: [
          '24×7 support with priority response',
          { label: 'Tickets:', text: '120 per month' },
          { label: 'End-user support:', text: 'Microsoft 365 apps, antivirus and general applications' },
          { label: 'Infrastructure:', text: 'up to 4 firewalls, 10 switches, 20 WiFi APs + controller, up to 10 servers/VMs on-prem or cloud, NAS, SAN, VMware' },
          { label: 'Microsoft 365:', text: 'Exchange, Teams, OneDrive, SharePoint Online, Entra ID, Security & Compliance Center' },
          { label: 'File shares:', text: 'up to 5 file servers plus 1 Azure file share' },
          { label: 'Backup:', text: 'infrastructure plus 1 annual restoration test (up to 3 servers/VMs)' },
          { label: 'Monitoring:', text: 'proactive, across IT performance and capacity' },
          { label: 'Security & compliance:', text: 'automated compliance reporting, audit remediation support' },
          'MSP tooling — ITSM (SummitAI), Power BI dashboards, quarterly business reviews',
        ],
        cta: { label: 'Contact us', href: '/contact' },
      },
    ],
  },
  {
    type: 'pricing',
    anchor: 'consultancy-rates',
    altBackground: false,
    eyebrow: 'Remote technical consultancy',
    heading: 'Hourly consultancy rates',
    body: 'Senior consultants on demand for project work or one-off support. Every discipline is billed at the same rate, so you can move between them without renegotiating.',
    columns: 3,
    note: 'All rates are GST exclusive and billed hourly with a four-hour minimum engagement. Pre-booking guarantees consultant availability.',
    plans: [
      {
        name: 'Database Support',
        price: '$150',
        unit: 'per hour',
        featured: false,
        description: 'Certified, experienced database administrators, available 24/7.',
        featuresTitle: "What's included",
        features: [
          { label: 'Expertise across:', text: 'Oracle, Microsoft SQL Server, MySQL, PostgreSQL, EDB Postgres, MariaDB, MongoDB' },
          { label: 'Cloud databases:', text: 'Amazon RDS, Azure SQL Database, Azure SQL Managed Instance, Google Cloud SQL, Oracle Autonomous Database' },
          { label: 'Services:', text: 'installation, configuration, backup & recovery, performance tuning, patching, migrations, troubleshooting, high availability and disaster recovery' },
          'Flexible hourly billing, four-hour minimum',
        ],
        cta: { label: 'Book Remote Support', href: '/contact' },
      },
      {
        name: 'Cloud Application Support',
        price: '$150',
        unit: 'per hour',
        featured: false,
        description: 'Certified cloud application consultants, available 24/7.',
        featuresTitle: "What's included",
        features: [
          { label: 'Microsoft platforms:', text: 'Microsoft 365, Azure App Services, Azure Functions, Power Platform (PowerApps, Power Automate, Power BI)' },
          { label: 'Containers:', text: 'Kubernetes, Docker, AKS' },
          { label: 'Lifecycle:', text: 'deployment, patching, upgrades, monitoring, troubleshooting' },
          { label: 'Integration & DevOps:', text: 'CI/CD pipelines across Azure DevOps, GitLab, GitHub Actions and Jenkins' },
          { label: 'Security & compliance:', text: 'identity and access management, Key Vault, secrets management, app security hardening' },
          'Pre-booking required for guaranteed availability',
        ],
        cta: { label: 'Book Remote Support', href: '/contact' },
      },
      {
        name: 'Cloud Infrastructure Support',
        price: '$150',
        unit: 'per hour',
        featured: false,
        description: 'Certified cloud architects and consultants, available 24/7.',
        featuresTitle: "What's included",
        features: [
          { label: 'Expertise:', text: 'Azure, AWS, Oracle Cloud (OCI) and Google Cloud — VMs, Kubernetes, containers, serverless and storage' },
          { label: 'Network & security:', text: 'VPC, VNets, transit gateways, load balancers, firewalls, IAM, RBAC, Key Vault, KMS, WAF and Zero Trust design' },
          { label: 'Automation:', text: 'CI/CD pipelines, Terraform, Ansible, monitoring' },
          { label: 'Services:', text: 'architecture design, migration, optimisation, cost management, disaster recovery planning and troubleshooting' },
          'Pre-booking required for guaranteed availability',
        ],
        cta: { label: 'Book Remote Support', href: '/contact' },
      },
      {
        name: 'Storage Administration',
        price: '$150',
        unit: 'per hour',
        featured: false,
        description: 'Experienced storage consultants, available 24/7.',
        featuresTitle: "What's included",
        features: [
          { label: 'Expertise across:', text: 'NetApp, Dell EMC, HPE, Hitachi, IBM, FC, iSCSI, NFS, CIFS, Veeam, Commvault' },
          { label: 'Services:', text: 'configuration, performance tuning, patching, troubleshooting, upgrades, replication and monitoring' },
          'Flexible hourly billing, four-hour minimum',
          'Pre-booking required for guaranteed availability',
        ],
        cta: { label: 'Book Remote Support', href: '/contact' },
      },
      {
        name: 'System Administration',
        price: '$150',
        unit: 'per hour',
        featured: false,
        description: 'Experienced system administrators, available 24/7.',
        featuresTitle: "What's included",
        features: [
          { label: 'Identity & web:', text: 'Active Directory, Entra ID, LDAP, Keycloak, Nginx clustering, HAProxy, Apache, Tomcat' },
          { label: 'Operating systems:', text: 'Windows Server, Linux (RHEL, CentOS, Ubuntu), UNIX (AIX, Solaris)' },
          { label: 'Virtualisation:', text: 'VMware, Hyper-V, Citrix' },
          { label: 'Services:', text: 'system configuration, patching, performance tuning, troubleshooting, upgrades and monitoring' },
          'Pre-booking required for guaranteed availability',
        ],
        cta: { label: 'Book Remote Support', href: '/contact' },
      },
      {
        name: 'Network & Firewall Support',
        price: '$150',
        unit: 'per hour',
        featured: false,
        description: 'Experienced network and security consultants, available 24/7.',
        featuresTitle: "What's included",
        features: [
          { label: 'Expertise across:', text: 'Cisco, Fortinet, Palo Alto, Juniper, Check Point, Sophos, F5 and Dell' },
          { label: 'Cloud firewalls:', text: 'AWS security groups, Azure Firewall, OCI network security' },
          { label: 'Services:', text: 'configuration, troubleshooting, upgrades and monitoring' },
          'Pre-booking required for guaranteed availability',
        ],
        cta: { label: 'Book Remote Support', href: '/contact' },
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'engagement-options',
    eyebrow: 'Flexible engagement options',
    heading: 'Buy blocked hours, or work time & materials',
    body: 'A cost-effective way to access expert support on demand while keeping complete control over scope and budget.',
    items: [
      'Purchase blocked hours tailored to your business needs',
      'Time & Material (T&M) contracts available',
      'Ideal for both ad-hoc requirements and long-term projects',
      'No fixed scope — full flexibility to adjust and scale as your project evolves',
      'No lock-in contracts on any engagement model',
    ],
    sidebar: {
      title: 'Rates at a glance',
      rows: [
        { label: 'Consultancy', value: '$150 / hour' },
        { label: 'Plan overage', value: '$140 / hour' },
        { label: 'Minimum engagement', value: '4 hours' },
        { label: 'Billing increments', value: '30 minutes' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'ctaBand',
    heading: 'Not sure which plan fits your environment?',
    body: "Book a free 30-minute call with a senior consultant. We'll size a plan against your instance count, data volume and response times — no obligation.",
    cta: { label: 'Book a Free Consultation', href: '/contact' },
  },
];

/**
 * On-call / ad-hoc DBA support, built from onsys.com.au/on-call-dba-services
 * with supporting material from /database-consultancy (the engagement types in
 * its callback form) and /fixed-price-database-projects (cost-saving framing).
 *
 * The live page contradicts itself on the SLA — the hero promises a one-hour
 * response while the plan's own feature list says two hours. The contractual
 * figure from the feature list is used here; see the note to the Onsys team.
 */
const onCallBlocks: Block[] = [
  {
    type: 'cardGrid',
    eyebrow: 'Why on-call DBA support',
    heading: 'Peace of mind without a DBA on payroll',
    body: 'A guaranteed response time, a dedicated phone number and helpdesk access, so you can reach a certified DBA at any hour — and pay for the calls you actually make.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Reduce costs', body: 'With an on-call subscription you hold the cover for a low monthly fee and pay for support calls only when you need one.', icon: '#s-managed', coverColor: '#EAF1FB' },
      { title: 'Improve availability', body: '24×7 service coverage for critical database infrastructure, so an out-of-hours incident does not wait until Monday.', icon: '#s-ha', coverColor: '#FFF1E0' },
      { title: 'Fast response', body: 'We attend to problems immediately, resolve the incident, investigate root cause and issue an incident report so it does not recur.', icon: '#s-emergency', coverColor: '#E7F5EC' },
      { title: 'Increase efficiency', body: 'Our database experts work alongside your own team on an incident rather than taking over, so knowledge stays in-house.', icon: '#s-consult', coverColor: '#F3F2F1' },
      { title: 'Experienced consultants', body: 'Certified professionals with years of production experience across current and legacy database technologies — no first-line triage layer.', icon: '#s-shield', coverColor: '#EAF1FB' },
      { title: 'Increase your resource pool', body: 'No more exposure to sick days, annual leave, absences or employee turnover taking your only DBA off the board.', icon: '#s-etl', coverColor: '#FFF1E0' },
    ],
  },
  {
    type: 'pricing',
    anchor: 'on-call-pricing',
    altBackground: false,
    eyebrow: 'On-call subscription',
    heading: 'Hold the cover, pay per call',
    body: 'Two components: a small monthly subscription that keeps a certified DBA on standby for your instances, and an hourly rate charged only when you actually raise a call.',
    columns: 2,
    note: 'All prices are GST exclusive. A minimum of 4 SQL Server instances applies to the subscription. If your estate needs continuous proactive monitoring rather than reactive call-out, the monthly 24/7 DBA plans start at $1,500 — see the full comparison on the pricing page.',
    plans: [
      {
        name: 'Remote On-Call DBA',
        price: '$100',
        unit: 'per SQL Server instance, per month',
        featured: false,
        description: 'Standby cover for teams running SQL Server without an in-house DBA. Minimum of 4 instances.',
        featuresTitle: 'What the subscription includes',
        features: [
          { label: 'Coverage:', text: 'Australian-based consultants available 24/7' },
          { label: 'Response SLA:', text: '2 hours, guaranteed' },
          { label: 'Contact:', text: 'dedicated phone support line plus service desk access' },
          { label: 'Onboarding:', text: 'live within 24 hours' },
          { label: 'Platforms:', text: 'SQL Server, Azure SQL and Managed Instance' },
          { label: 'Environments:', text: 'on-premises, AWS and Azure' },
          'Secure remote access for issue resolution',
          'Certified, experienced DBAs — no first-line triage layer',
        ],
        cta: { label: 'Get Started', href: '/contact' },
      },
      {
        name: 'Support calls',
        price: '$150',
        unit: 'per hour, only when you call',
        featured: false,
        description: 'Charged against actual time worked on an incident, so a quiet month costs you the subscription alone.',
        featuresTitle: 'How calls are billed',
        features: [
          'Billed only for hours actually worked on your incident',
          'Available 24/7, including after hours, weekends and public holidays',
          'Incident report issued after resolution, with root cause',
          'Scheduled after-hours or weekend work can be booked in advance',
          'No charge for months in which you raise no calls',
        ],
        cta: { label: 'Talk to a consultant', href: '/contact' },
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'when-to-use',
    eyebrow: 'When on-call fits',
    heading: 'Cover for the hours you cannot staff',
    body: 'On-call suits teams that run their own databases day to day but have no answer for nights, weekends and leave. Common reasons clients call:',
    items: [
      'After-business-hours support when something breaks overnight',
      'Weekend scheduled work — patching, migrations, cutovers',
      'Full 24/7 cover for a short period while a DBA is on leave',
      'A second opinion from a senior DBA during an incident',
      'Overflow capacity when your team is committed to a project',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Subscription', value: '$100 / instance / month' },
        { label: 'Minimum estate', value: '4 SQL Server instances' },
        { label: 'Support calls', value: '$150 / hour' },
        { label: 'Response SLA', value: '2 hours, 24/7' },
        { label: 'Onboarding', value: 'Within 24 hours' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'steps',
    eyebrow: 'Getting started',
    heading: 'Live within 24 hours',
    body: 'No lengthy procurement cycle — most clients are covered the day after the first call.',
    steps: [
      { title: 'Scoping call', body: 'A senior consultant confirms your instance count, versions, platform and the hours you need covered.' },
      { title: 'Environment details', body: 'You share database versions, operating systems and hosting — on-premises, VMware, Hyper-V, AWS, Azure or Oracle Cloud.' },
      { title: 'Secure access & onboarding', body: 'We establish secure remote access, document escalation paths and issue your dedicated support number.' },
      { title: 'Cover goes live', body: 'The 2-hour response SLA starts, and you can raise a call at any hour from that point.' },
    ],
  },
  {
    type: 'platformChips',
    eyebrow: 'What we cover',
    heading: 'Versions, platforms and hosting',
    body: 'On-call covers current and legacy SQL Server estates wherever they run — including versions past their vendor support date.',
    groups: [
      {
        title: 'Database versions',
        chips: [
          { label: 'SQL Server 2022 / 2019', color: '#CC2927' },
          { label: 'SQL Server 2017 / 2016', color: '#A4373A' },
          { label: 'SQL Server 2014 and below', color: '#8A5A44' },
          { label: 'Azure SQL Database', color: '#0078D4' },
          { label: 'Azure SQL Managed Instance', color: '#0063B1' },
          { label: 'SQL Server on Azure VM', color: '#00A4EF' },
        ],
      },
      {
        title: 'Operating systems',
        chips: [
          { label: 'Windows Server 2022 / 2019 / 2016', color: '#00A4EF' },
          { label: 'Windows Server 2012 and below', color: '#605E5C' },
          { label: 'Linux, CentOS, Ubuntu', color: '#EE0000' },
        ],
      },
      {
        title: 'Hosting platform',
        chips: [
          { label: 'VMware', color: '#607078' },
          { label: 'Hyper-V', color: '#0078D4' },
          { label: 'AWS', color: '#FF9900' },
          { label: 'Microsoft Azure', color: '#0078D4' },
          { label: 'Oracle Cloud (OCI)', color: '#C74634' },
          { label: 'Physical hosts', color: '#605E5C' },
        ],
      },
    ],
    sidebar: {
      title: 'Not just SQL Server?',
      items: [
        'On-call subscription covers SQL Server estates.',
        'Oracle, PostgreSQL, EDB, MySQL and MongoDB are covered by the monthly 24/7 DBA plans.',
        'Hourly consultancy at $150/hr covers every platform with a four-hour minimum.',
      ],
    },
  },
  {
    type: 'cardGrid',
    eyebrow: 'Choosing between them',
    heading: 'On-call, monthly plan or hourly consultancy?',
    body: 'Three ways to get a senior DBA. The right one depends on whether you need cover, continuous management, or a defined piece of work.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'On-call / ad-hoc',
        body: 'You run the databases and need a safety net. $100 per instance per month holds the cover; calls are $150/hr. Reactive, not monitored.',
        tag: 'This page',
        link: { label: 'See what it includes', href: '#on-call-pricing' },
      },
      {
        title: 'Monthly 24/7 DBA plan',
        body: 'We run the databases. Proactive monitoring, health-check reporting and included service hours from $1,500/month, across every major platform.',
        tag: 'From $1,500/mo',
        link: { label: 'Compare the plans', href: '/pricing-and-plans' },
      },
      {
        title: 'Hourly consultancy',
        body: 'A defined piece of work — a migration, an upgrade, a tuning exercise. $150/hr with a four-hour minimum and no ongoing commitment.',
        tag: '$150/hr',
        link: { label: 'See consultancy rates', href: '/pricing-and-plans#consultancy-rates' },
      },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Tailor-made database support for your environment',
    body: 'Every business is different. Tell us your instance count and the hours you need covered, and we will put together a solution that fits — at no cost.',
    cta: { label: 'Schedule a Free Consultation', href: '/contact' },
  },
];

/**
 * Emergency database support — a new page, not a port of an existing one.
 *
 * Deliberately conservative on commitments: Onsys publishes response SLAs for
 * plan and on-call subscribers only, so this page states the contracted SLA for
 * those customers and is explicit that a caller without a plan gets the next
 * available consultant at the published $150/hr rate rather than a guarantee.
 * Nothing here invents a commercial term that is not already published.
 */
const emergencyBlocks: Block[] = [
  {
    type: 'cardGrid',
    eyebrow: 'When to call',
    heading: 'The situations we get called for at 2am',
    body: 'If production is down, degraded or at risk of data loss, call rather than email. These are the failures our on-call DBAs handle most often.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Database will not start', body: 'A service that fails after a reboot, patch or host migration — including corrupt system databases and broken startup parameters.', icon: '#s-emergency', coverColor: '#FFF1E0' },
      { title: 'Corruption or a failed restore', body: 'Consistency errors, a backup chain that will not restore, or a recovery that has stalled part way through.', icon: '#s-managed', coverColor: '#EAF1FB' },
      { title: 'Deleted or encrypted data', body: 'Accidental deletion, a destructive script run against production, or a ransomware event where you need to establish what is recoverable.', icon: '#s-shield', coverColor: '#E7F5EC' },
      { title: 'Upgrade or patch gone wrong', body: 'A version upgrade or cumulative update that has left the instance unusable, and a rollback that needs to be executed under time pressure.', icon: '#s-ha', coverColor: '#F3F2F1' },
      { title: 'Failover that did not fail over', body: 'AlwaysOn availability groups, failover clusters, Data Guard or replication that has broken, split-brained or refused to come up on the secondary.', icon: '#s-consult', coverColor: '#EAF1FB' },
      { title: 'Performance collapse', body: 'Severe blocking, runaway queries, a full transaction log or exhausted storage that has taken the application down without taking the server down.', icon: '#s-etl', coverColor: '#FFF1E0' },
    ],
  },
  {
    type: 'steps',
    eyebrow: 'What happens next',
    heading: 'From your call to service restored',
    body: 'The first priority is getting you back online. Root cause analysis follows once the bleeding has stopped.',
    steps: [
      { title: 'You call, we answer', body: 'The support line is answered 24 hours a day, including weekends and public holidays. Have your instance name, the error and the time it started ready.' },
      { title: 'Senior DBA triage', body: 'A certified consultant assesses the failure, confirms the blast radius and tells you honestly what is recoverable and what is not before work begins.' },
      { title: 'Stabilise and restore', body: 'We work over secure remote access, alongside your team rather than around them, to get the service back and protect against further data loss.' },
      { title: 'Root cause and report', body: 'Once you are stable you get a written incident report with the cause, what we changed, and what to fix so it does not happen again.' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'what-you-get',
    eyebrow: 'How it works',
    heading: 'No contract required to make the call',
    body: 'You do not need an existing agreement to get help in an outage. Work is billed against the published remote consultancy rate, and we tell you the likely cost before we start.',
    items: [
      'Answered 24/7 by Australian-based senior consultants',
      'Certified DBAs only — no first-line triage layer to get through',
      'Secure remote access established at the start of the call',
      'We work with your team, so knowledge stays in your business',
      'Written incident report with root cause after resolution',
      'Honest assessment up front — including when the answer is that data is not recoverable',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Availability', value: '24 / 7 / 365' },
        { label: 'Rate', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'Existing plan clients', value: 'Your contracted SLA applies' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'platformChips',
    eyebrow: 'What we can help with',
    heading: 'Platforms our on-call consultants cover',
    body: 'Emergency support spans the same estate as our managed plans — current and legacy versions, on-premises and in the cloud.',
    groups: [
      {
        title: 'Database platforms',
        chips: [
          { label: 'SQL Server (2008–2022)', color: '#CC2927' },
          { label: 'Oracle (10g–23ai)', color: '#C74634' },
          { label: 'PostgreSQL & EDB', color: '#336791' },
          { label: 'MySQL & MariaDB', color: '#00758F' },
          { label: 'MongoDB', color: '#13AA52' },
          { label: 'Azure SQL & Managed Instance', color: '#0078D4' },
        ],
      },
      {
        title: 'High availability & recovery',
        chips: [
          { label: 'AlwaysOn availability groups', color: '#CC2927' },
          { label: 'Failover clustering', color: '#A4373A' },
          { label: 'Oracle RAC & Data Guard', color: '#C74634' },
          { label: 'Replication & log shipping', color: '#605E5C' },
          { label: 'RMAN & native backups', color: '#8A5A44' },
          { label: 'Veeam & Commvault', color: '#00B159' },
        ],
      },
      {
        title: 'Where it runs',
        chips: [
          { label: 'On-premises', color: '#605E5C' },
          { label: 'VMware & Hyper-V', color: '#607078' },
          { label: 'Microsoft Azure', color: '#0078D4' },
          { label: 'AWS', color: '#FF9900' },
          { label: 'Oracle Cloud (OCI)', color: '#C74634' },
        ],
      },
    ],
  },
  {
    type: 'cardGrid',
    eyebrow: 'Response times',
    heading: 'What you can expect when you call',
    body: 'A guaranteed response time is something you hold in advance, not something you can buy mid-outage. Here is exactly what applies to you.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'On a monthly DBA plan',
        body: 'Your contracted SLA applies — one hour on Plans B and C, two hours on Plan A. Incident work draws on your included service hours first.',
        tag: 'Guaranteed SLA',
        link: { label: 'See the plans', href: '/pricing-and-plans' },
      },
      {
        title: 'On an on-call subscription',
        body: 'A guaranteed two-hour response, 24/7, on your dedicated support line. Call time is billed at $150 per hour against actual work done.',
        tag: '2-hour SLA',
        link: { label: 'How on-call works', href: '/on-call-dba-services' },
      },
      {
        title: 'No existing agreement',
        body: 'We will connect you with the next available senior consultant and start as soon as access is in place — but without a plan there is no contracted response time. Billed at $150 per hour, four-hour minimum.',
        tag: 'Best effort',
        link: { label: 'Avoid this next time', href: '/on-call-dba-services' },
      },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Production down right now?',
    body: 'Call the support line — it is answered 24 hours a day, every day. If it is urgent but not critical, send the details and a consultant will come back to you.',
    cta: { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
  },
  {
    type: 'contactForm',
    heading: 'Not critical enough to call?',
    body: 'Describe what is happening and a senior consultant will get back to you. For anything affecting production right now, please use the phone.',
  },
];

/**
 * Database consultancy, from onsys.com.au/database-consultancy.
 *
 * The source page lists 18 near-identical cards of generic copy ("Elevate your
 * data landscape...", "Unlock unparalleled..."), two of which are literal
 * duplicates, and none of which name a deliverable. They are regrouped here
 * into six capability themes written around what the client actually gets,
 * with the full bookable list kept below so nothing is lost.
 */
const consultancyBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'capabilities',
    eyebrow: 'Where a consultant earns their fee',
    heading: 'Six things we get called in for',
    body: 'No matter how large or small your database estate, our consultants work as an extension of your team — scoping the work, delivering it, and handing back something your people can run.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'Design & architecture',
        body: 'New database infrastructure and application data architecture designed for the workload you actually have — sized, documented and built to grow without a re-platform in two years.',
        icon: '#s-managed',
        coverColor: '#EAF1FB',
        tag: 'Greenfield & redesign',
      },
      {
        title: 'Migrations & platform moves',
        body: 'Database, platform and data migrations to Azure, AWS or Oracle Cloud — assessed, rehearsed and cut over with a rollback plan, so the go-live weekend is boring.',
        icon: '#s-cloud',
        coverColor: '#FFF1E0',
        tag: 'Azure · AWS · OCI',
        link: { label: 'Migration paths', href: '/database-upgrades-migrations-dr' },
      },
      {
        title: 'High availability & DR',
        body: 'AlwaysOn availability groups, SQL Server failover clusters, Oracle RAC and DR solutions — designed against a real RPO and RTO, then failover-tested rather than assumed.',
        icon: '#s-ha',
        coverColor: '#E7F5EC',
        tag: 'Tested, not assumed',
        link: { label: 'HA & DR solutions', href: '/database-upgrades-migrations-dr#hadr-solutions' },
      },
      {
        title: 'Upgrades & patching',
        body: 'Version upgrades and patch campaigns off unsupported releases, with compatibility analysis first and a tested rollback path before anything touches production.',
        icon: '#s-shield',
        coverColor: '#F3F2F1',
        tag: 'Off unsupported versions',
        link: { label: 'Upgrade paths', href: '/database-upgrades-migrations-dr' },
      },
      {
        title: 'Data, BI & integration',
        body: 'ETL and integration pipelines, SSRS reporting and business intelligence models that turn the data you already hold into something the business will actually open.',
        icon: '#s-etl',
        coverColor: '#EAF1FB',
        tag: 'ETL · SSRS · BI',
      },
      {
        title: 'Licensing & cost optimisation',
        body: 'License usage review and virtualisation strategy to cut total cost of ownership — often the fastest payback of anything on this page, and frequently self-funding.',
        icon: '#s-consult',
        coverColor: '#FFF1E0',
        tag: 'Reduce TCO',
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'what-you-can-book',
    eyebrow: 'Scope',
    heading: 'Everything you can book a consultant for',
    body: 'Engagements run from a half-day health check to a multi-month migration programme. If what you need is not on this list, it is still worth asking.',
    items: [
      'Discuss and plan a new database project',
      'Perform a database health check',
      'Database upgrade or patching',
      'Implement a high-availability solution or build a database cluster',
      'Backup, recovery and disaster recovery design',
      'Performance tuning and optimisation',
      'Troubleshoot and fix a specific database problem',
      'ETL, integration and data migration work',
      'Database development and SSRS reporting solutions',
      'Database monitoring design and implementation',
      'License optimisation and virtualisation review',
      'On-site DBA support where remote will not do',
    ],
    sidebar: {
      title: 'Typical engagements',
      rows: [
        { label: 'Advisory & consultancy', value: '$150 / hour' },
        { label: 'Minimum engagement', value: '4 hours' },
        { label: 'Defined-scope project', value: 'Fixed price' },
        { label: 'Project payments', value: 'Milestone-based' },
        { label: 'Ongoing cover', value: 'From $1,500 / month' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'steps',
    eyebrow: 'How it runs',
    heading: 'From first call to handover',
    body: 'Every engagement follows the same shape, whether it is two days or two months.',
    steps: [
      { title: 'Scoping call', body: 'A senior consultant — not a salesperson — works out what you are trying to achieve, what constraints you are under, and whether the job is worth doing at all.' },
      { title: 'Assessment & options', body: 'We assess the current environment and come back with options, costs and risks, so you can choose on evidence rather than on a vendor recommendation.' },
      { title: 'Delivery', body: 'Work runs to the agreed scope with defined deliverables. Fixed-price projects pay on milestones; advisory work is billed against actual hours.' },
      { title: 'Handover & documentation', body: 'You get the environment, the runbooks and the reasoning behind the decisions — so your team can operate it without calling us back for every change.' },
    ],
  },
  {
    type: 'platformChips',
    eyebrow: 'Specialisms',
    heading: 'Where our consultants have depth',
    body: 'Our database specialists have many years of industry experience improving performance in EDB, SQL Server and Oracle environments across a range of industries.',
    groups: [
      {
        title: 'Core database platforms',
        chips: [
          { label: 'Microsoft SQL Server', color: '#CC2927' },
          { label: 'Oracle Database', color: '#C74634' },
          { label: 'EDB Postgres', color: '#336791' },
          { label: 'PostgreSQL', color: '#31648C' },
          { label: 'MySQL & MariaDB', color: '#00758F' },
          { label: 'MongoDB', color: '#13AA52' },
        ],
      },
      {
        title: 'High availability & clustering',
        chips: [
          { label: 'AlwaysOn availability groups', color: '#CC2927' },
          { label: 'SQL Server failover clustering', color: '#A4373A' },
          { label: 'Oracle RAC & Data Guard', color: '#C74634' },
          { label: 'MySQL Group Replication', color: '#00758F' },
          { label: 'PostgreSQL streaming replication', color: '#336791' },
        ],
      },
      {
        title: 'Data, BI & cloud',
        chips: [
          { label: 'SSIS · SSRS · SSAS', color: '#0E336A' },
          { label: 'ETL & integration', color: '#1E529D' },
          { label: 'Microsoft Azure', color: '#0078D4' },
          { label: 'AWS', color: '#FF9900' },
          { label: 'Oracle Cloud (OCI)', color: '#C74634' },
        ],
      },
    ],
    sidebar: {
      title: 'Why it costs less than you think',
      items: [
        'Optimising license usage often pays for the engagement outright.',
        'Virtualisation and consolidation cut hardware and licence counts together.',
        'Reducing total cost of ownership is treated as a deliverable, not a slogan.',
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'engagement-models',
    eyebrow: 'Commercials',
    heading: 'Three ways to engage a consultant',
    body: 'Pick the model that matches the certainty of your scope. Most clients use more than one over time.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'Hourly advisory',
        body: 'Scope is open or exploratory. $150 per hour with a four-hour minimum, billed against actual time. Ideal for health checks, second opinions and troubleshooting.',
        tag: '$150/hr',
        link: { label: 'See consultancy rates', href: '/pricing-and-plans#consultancy-rates' },
      },
      {
        title: 'Fixed-price project',
        body: 'Scope is defined. One agreed price with milestone-based payments and guaranteed timelines, so a migration or HA build carries no budget risk.',
        tag: 'Milestone-based',
        link: { label: 'How projects are priced', href: '/pricing-and-plans' },
      },
      {
        title: 'Ongoing cover',
        body: 'The project is done and someone has to run it. Monthly DBA plans from $1,500, or on-call standby from $100 per instance per month.',
        tag: 'From $1,500/mo',
        link: { label: 'Compare support options', href: '/on-call-dba-services' },
      },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Planning a new database project?',
    body: 'Book a meeting with an experienced database consultant to plan it properly. The first conversation is free, and we will tell you if the work is not worth doing.',
    cta: { label: 'Schedule a Call', href: '/contact' },
  },
];

/**
 * Product catalogue.
 *
 * To add a future product, append an entry to the `products` array below — the
 * grid is `auto-fit` so it reflows to any number without a layout change. Each
 * product needs a `cta` (its own site or a detail page) and should keep the
 * secondary CTA pointing at /contact so every card has an enquiry route.
 */
const productsBlocks: Block[] = [
  {
    type: 'productGrid',
    anchor: 'catalogue',
    altBackground: false,
    eyebrow: 'The catalogue',
    heading: 'Software Onsys builds and backs',
    body: 'Two platforms built in-house and one world-class product we partner on — each backed by the same engineers who run our managed services, so the software and the support come from one place.',
    products: [
      {
        name: 'OnsysConnect',
        tagline: 'Data Sharing Platform',
        body: 'A secure, multi-tenant platform for exchanging sensitive data between trusted organisations — sitting between your source systems and the apps that consume them, with every call governed, metered and audited.',
        badge: 'Award-winning',
        icon: '#s-etl',
        coverColor: '#EAF1FB',
        features: [
          'API-first architecture with dedicated endpoints per partner',
          'Data classification — owners choose what each partner sees',
          'Multi-layer approval workflows for access requests',
          'Usage metering and subscription billing on API calls',
          'End-to-end encryption with full audit logging',
        ],
        cta: { label: 'More info', href: 'https://onsysconnect.com/data-sharing-platform/' },
        secondaryCta: { label: 'Talk to us', href: '/contact' },
      },
      {
        name: 'Onsys IDMS',
        tagline: 'Digital ID Management System',
        body: 'An open-source, biometric-enabled identity platform for national-scale programmes. One person, one ID — enforced at enrolment with ABIS-backed matching, quality and liveness checks, and a full decision audit trail.',
        badge: 'Open source',
        icon: '#s-shield',
        coverColor: '#E7F5EC',
        features: [
          'Online application, appointment booking and ICAO-standard capture',
          '1:N de-duplication and watchlist screening with human review',
          'Issuance, personalisation, stock control and activation',
          'eKYC verification for relying parties, with metering and billing',
          'Keycloak SSO, mTLS, HSM support and full lifecycle audit',
        ],
        cta: { label: 'More info', href: 'https://onsysconnect.com/onsys-idms/' },
        secondaryCta: { label: 'Talk to us', href: '/contact' },
      },
      {
        name: 'Dbvisit StandbyMP',
        tagline: 'Disaster recovery for Oracle SE',
        body: 'Gold-standard disaster recovery without the enterprise price tag. Onsys partners with Dbvisit to deliver and support a continuously updated standby database — trusted by more than 1,300 customers across 110 countries.',
        badge: 'Partner product',
        icon: '#s-ha',
        coverColor: '#FFF1E0',
        features: [
          'The leading DR solution for Oracle Standard Edition, SE1 and SE2',
          'Also protects Microsoft SQL Server and PostgreSQL',
          'Runs on-premises or in the cloud, including Oracle Database Appliance',
          'Cuts DR cost against Enterprise Edition licensing',
          'Implemented and supported by Onsys DBAs, not just resold',
        ],
        cta: { label: 'More info', href: 'https://www.onsys.com.au/dbvisit/' },
        secondaryCta: { label: 'Talk to us', href: '/contact' },
      },
    ],
  },
  {
    type: 'cardGrid',
    eyebrow: 'Why buy software from an operations company',
    heading: 'Built by the people who have to run it',
    body: 'Our products come out of two decades of running production database and identity systems for other people — which shapes what gets built and what gets supported.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Recognised work', body: 'OnsysConnect took BRONZE at the National Best Quality Software Awards (NBQSA) 2025 and Second Runner-up at APICTA 2025 — judged against the region, not just the local market.' },
      { title: 'One team, software and support', body: 'The engineers who build the platform are in the same organisation as the DBAs who keep it running, so an escalation does not bounce between a vendor and an integrator.' },
      { title: 'Open where it matters', body: 'Onsys IDMS is open source, and every product is built on standard components — Keycloak, OAuth2/OIDC, REST — so you are not buying a black box you cannot audit or leave.' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'foundations',
    eyebrow: 'Common foundations',
    heading: 'The same security posture across the catalogue',
    body: 'Whichever product you deploy, the architecture underneath follows the same principles — because the same team designed it.',
    items: [
      'Keycloak SSO with OAuth2 / OpenID Connect and role-based access',
      'Edge protection — WAF and reverse proxy with TLS termination and rate limiting',
      'Modular microservices, so components scale and update independently',
      'Full audit logging and reporting on every transaction, for compliance',
      'Deployable on Azure, AWS, Oracle Cloud or on-premises',
      'Integration through documented REST APIs rather than bespoke connectors',
    ],
    sidebar: {
      title: 'Considering a deployment?',
      rows: [
        { label: 'Demo', value: 'Free, no obligation' },
        { label: 'Deployment', value: 'Cloud or on-premises' },
        { label: 'Delivered by', value: 'Onsys engineers' },
        { label: 'Support', value: 'Backed by 24/7 plans' },
      ],
    },
  },
  {
    type: 'ctaBand',
    heading: 'Want to see one of these running?',
    body: 'Tell us what you are trying to solve and we will walk you through the product that fits — architecture, deployment options and pricing patterns included. No obligation.',
    cta: { label: 'Request a Demo', href: '/contact' },
  },
  {
    type: 'contactForm',
    heading: 'Ask about a product',
    body: 'Let us know which product you are interested in and what you are trying to achieve. A consultant who works on it will come back to you.',
  },
];

/**
 * Upgrades, migrations and DR — merges onsys.com.au/database-patching-and-upgrade
 * and /high-availability-solutions, which sell the same delivery capability from
 * two angles and repeat a near-identical nine/ten-step "OUR APPROACH" list. That
 * list is consolidated into one five-step method here, and the delivery
 * guarantees buried at the bottom of the HA page are promoted, because "two
 * specialists per project, peer reviewed" is the concrete differentiator.
 */
const upgradeDrBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'why-upgrade',
    eyebrow: 'The cost of staying put',
    heading: 'Running an unsupported database version?',
    body: 'Every month on an unsupported release is a month without security patches, on hardware that is drifting out of compatibility, with no vendor to escalate to. Upgrading buys back six things at once.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Security', body: 'Supported platforms receive regular security updates, patches and bug fixes — reducing exposure to breaches, hacking and unauthorised access.', icon: '#s-shield', coverColor: '#FFF1E0' },
      { title: 'Performance', body: 'Newer releases bring better performance, scalability and reliability, with faster query response and improved overall system throughput.', icon: '#s-managed', coverColor: '#EAF1FB' },
      { title: 'Compatibility', body: 'Supported versions work with modern hardware and software, cutting the integration problems that come from an ageing platform.', icon: '#s-etl', coverColor: '#E7F5EC' },
      { title: 'Vendor support', body: 'A supported platform comes with technical support, documentation and online resources, so issues get resolved rather than worked around.', icon: '#s-consult', coverColor: '#F3F2F1' },
      { title: 'New capability', body: 'Upgrades introduce features that streamline processes, improve data analysis and support better decision-making.', icon: '#s-code', coverColor: '#EAF1FB' },
      { title: 'Lower cost', body: 'Staying on an outdated platform is expensive in maintenance, extended support and downtime. Upgrading reduces those costs over time.', icon: '#s-cloud', coverColor: '#FFF1E0' },
    ],
  },
  {
    type: 'platformChips',
    eyebrow: 'Upgrade & migration paths',
    heading: 'Routes we have run before',
    body: 'These are established paths, not exploratory work — each has been executed on production estates with a tested rollback plan behind it.',
    groups: [
      {
        title: 'SQL Server upgrades',
        chips: [
          { label: 'SQL 2012 / 2014 → 2017 / 2019', color: '#CC2927' },
          { label: 'SQL 2008 → 2012 / 2016 / 2017 / 2019', color: '#A4373A' },
          { label: 'SQL 2005 → 2012 / 2016 / 2017 / 2019', color: '#8A5A44' },
          { label: 'SQL 2000 → 2012 / 2016 / 2017 / 2019', color: '#605E5C' },
          { label: 'Service packs on 2016 / 2017 / 2019', color: '#CC2927' },
          { label: 'Hotfixes & patches on any instance', color: '#A4373A' },
        ],
      },
      {
        title: 'Oracle & other platforms',
        chips: [
          { label: 'Upgrade to Oracle 12c / 18c / 19c', color: '#C74634' },
          { label: 'Critical patches', color: '#C74634' },
          { label: 'PSU / CPU application', color: '#8A5A44' },
          { label: 'GoldenGate upgrade', color: '#C74634' },
          { label: 'MySQL upgrade', color: '#00758F' },
          { label: 'OEM upgrade', color: '#C74634' },
          { label: 'WebLogic upgrade', color: '#8A5A44' },
        ],
      },
      {
        title: 'Platform & cloud migrations',
        chips: [
          { label: 'Oracle → EDB Postgres', color: '#336791' },
          { label: 'Oracle cross-platform', color: '#C74634' },
          { label: 'SQL Server → Azure SQL', color: '#0078D4' },
          { label: 'SQL Server → Azure SQL MI', color: '#0063B1' },
          { label: 'On-premises → AWS', color: '#FF9900' },
          { label: 'On-premises → Azure', color: '#0078D4' },
          { label: 'On-premises → Oracle Cloud', color: '#C74634' },
        ],
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'hadr-solutions',
    eyebrow: 'High availability & disaster recovery',
    heading: 'The HA and DR solutions we build',
    body: 'An RPO and RTO on a slide is not a DR plan. We design against your actual recovery targets, then prove them with a tested failover before handover.',
    items: [
      'SQL Server AlwaysOn availability groups',
      'SQL Server failover clustering',
      'SQL Server database mirroring',
      'SQL Server replication and log shipping',
      'Oracle Data Guard implementation',
      'Oracle Real Application Clusters (RAC)',
      'MySQL clustering solutions',
      'EDB Postgres Failover Manager',
    ],
    sidebar: {
      title: 'How it is priced',
      rows: [
        { label: 'Defined scope', value: 'Fixed price' },
        { label: 'Payments', value: 'Milestone-based' },
        { label: 'Open scope', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'Scoping call', value: 'Free' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'steps',
    eyebrow: 'How we deliver',
    heading: 'Five stages, ITIL change management throughout',
    body: 'The same method whether it is a patch window or a platform migration — the difference is scale, not rigour.',
    steps: [
      { title: 'Understand & assess', body: 'Business requirements, feasibility study, risk assessment and dependency analysis, so nobody discovers the linked server on cutover night.' },
      { title: 'Design & plan', body: 'Solution design against your real RPO and RTO, an implementation and rollback plan, and stakeholder engagement before a change ticket is raised.' },
      { title: 'Prove it', body: 'A proof of concept where the risk warrants one, so the approach is validated somewhere other than production.' },
      { title: 'Implement & test', body: 'Execution under ITIL change management, with failover and application testing to confirm the outcome rather than assume it.' },
      { title: 'Release & document', body: 'Production release, comprehensive design, build and operational documentation, and a closed change record your auditors can follow.' },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'delivery-standards',
    eyebrow: 'On every project',
    heading: 'What you get regardless of scope',
    body: 'These are standard inclusions, not upsells — they are how we keep delivery predictable for you and for us.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Two specialists, minimum', body: 'At least two database specialists are assigned to every project, so delivery never depends on one person being available.', tag: 'No single point of failure' },
      { title: 'Peer-reviewed quality', body: 'A peer review process at each stage means the work is checked by a second senior engineer before it reaches your environment.', tag: 'Reviewed at each stage' },
      { title: 'Full documentation', body: 'Comprehensive design, build and operational documents — so your team can run and troubleshoot what we hand over.', tag: 'Design, build, operate' },
      { title: 'Weekly reporting', body: 'Weekly project reporting and billing on time-and-materials engagements, so there are no surprises at invoice time.', tag: 'Weekly cadence' },
      { title: 'On-time delivery', body: 'Our team works around the clock where a cutover window demands it, to hit the date you have committed to internally.', tag: 'Around the clock' },
      { title: 'Fixed-price option', body: 'Where scope can be defined, the whole project is quoted as one fixed price with milestone payments and no cost-overrun risk.', tag: 'Milestone-based', link: { label: 'See project pricing', href: '/pricing-and-plans' } },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Still on a version nobody supports?',
    body: 'Book a free scoping call. We will assess the upgrade path, flag the dependencies that usually bite, and tell you what it would take — with no obligation to proceed.',
    cta: { label: 'Book a Free Scoping Call', href: '/contact' },
  },
];

/**
 * Legal pages.
 *
 * Based on the documents Onsys already publishes, corrected against what this
 * platform actually does: it sets no advertising cookies and processes no card
 * payments, but it does disclose data to OpenAI and to staff in Sri Lanka.
 * Both of those are stated explicitly because APP 8 requires it.
 *
 * These are drafted, not legally reviewed. Have a lawyer check them before go-live.
 */
const LEGAL_EFFECTIVE = 'August 2026';

const privacyBlocks: Block[] = [
  {
    type: 'richText',
    html: `
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE}</p>
<p>${org.legalName} (ABN ${org.abn}, ACN ${org.acn}) (<strong>&ldquo;Onsys&rdquo;</strong>, <strong>&ldquo;we&rdquo;</strong>, <strong>&ldquo;us&rdquo;</strong>) is committed to protecting your privacy. This policy explains how we collect, hold, use and disclose personal information, and how we comply with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).</p>
<p>It applies to onsys.com.au and to the services we provide. By using this website or engaging us, you agree to the handling of your information as described here.</p>

<h2>1. The information we collect</h2>
<p>We only collect personal information that is reasonably necessary for our functions and activities.</p>
<h3>When you contact us through this website</h3>
<ul>
<li><strong>Identity and contact details</strong> &mdash; your name, email address, phone number and company name</li>
<li><strong>Enquiry details</strong> &mdash; the service you are interested in and the message you send us</li>
<li><strong>Marketing attribution</strong> &mdash; the referring website and any campaign parameters in the link you arrived through</li>
</ul>
<h3>When you use the chat assistant</h3>
<ul>
<li>Any name and email address you choose to provide</li>
<li>The content of your conversation</li>
<li>The page you opened the chat from, and your browser user-agent string</li>
<li>A <strong>one-way hash of your IP address</strong>. We do not store your raw IP address against a chat session.</li>
</ul>
<h3>When we deliver services to you</h3>
<ul>
<li>Business contact details for the people we work with at your organisation</li>
<li>Service records &mdash; tickets, incidents, change records and correspondence</li>
<li>Credentials for access to your systems, held under the terms of our engagement</li>
</ul>
<p>We do not collect sensitive information as defined in the Privacy Act, and we do not collect government identifiers, through this website. We do not process card payments on this website.</p>

<h2>2. How we collect it</h2>
<p>We collect personal information directly from you &mdash; through our contact form, the chat assistant, email, phone or in the course of an engagement. Where it is reasonable and practicable, we collect it from you rather than from anyone else. If you provide us with personal information about another person, you must have their consent to do so.</p>

<h2>3. Why we use it</h2>
<ul>
<li>To respond to your enquiry and provide a quote or proposal</li>
<li>To deliver, manage and support the services you engage us for</li>
<li>To manage our relationship with you, including billing and account administration</li>
<li>To improve our website, services and support</li>
<li>To send you service information, and marketing communications where you have consented</li>
<li>To meet our legal, regulatory and insurance obligations</li>
</ul>

<h2>4. Cookies and analytics</h2>
<p>We keep tracking on this website deliberately minimal.</p>
<ul>
<li><strong>We do not use advertising or re-targeting cookies.</strong> We do not run Google Ads, Meta or LinkedIn tracking pixels on this site.</li>
<li><strong>Analytics.</strong> We use Plausible Analytics, a privacy-focused service that measures aggregate traffic without cookies and without collecting personal information or building cross-site profiles.</li>
<li><strong>Essential cookies.</strong> A session cookie and a CSRF-protection cookie are set only when a staff member signs in to our content management system. Ordinary visitors are not issued these cookies.</li>
<li><strong>Spam protection.</strong> Cloudflare Turnstile runs on our contact form to distinguish humans from automated submissions.</li>
</ul>
<p>You can block or delete cookies in your browser. Doing so will not affect your ability to browse this website.</p>

<h2>5. Who we disclose information to</h2>
<p><strong>We do not sell your personal information.</strong> We disclose it only as follows:</p>
<ul>
<li><strong>Our people</strong> &mdash; Onsys employees and contractors who need it to do their job</li>
<li><strong>Service providers</strong> &mdash; the suppliers listed in section 6, who host our infrastructure and operate parts of this website</li>
<li><strong>Professional advisers</strong> &mdash; our lawyers, accountants, auditors and insurers, where relevant</li>
<li><strong>Legal and regulatory bodies</strong> &mdash; where we are required or authorised by law to disclose</li>
<li><strong>A successor</strong> &mdash; in the event of a sale, merger or restructure of our business, subject to confidentiality</li>
</ul>

<h2>6. Overseas disclosure</h2>
<p>Some of your information is accessed or processed outside Australia. Before disclosing information overseas we take reasonable steps to ensure the recipient handles it consistently with the APPs.</p>
<ul>
<li><strong>Sri Lanka.</strong> Onsys operates a delivery centre in Colombo. Our offshore team members may access service records and correspondence in the course of delivering support, under the same confidentiality obligations as our Australian staff.</li>
<li><strong>United States.</strong> If you use the chat assistant, the content of your messages is sent to OpenAI to generate a response. Do not enter confidential information, credentials or personal information about others into the chat.</li>
<li><strong>Microsoft.</strong> We use Microsoft services to send transactional email and, where a chat conversation is escalated to a person, to route that conversation to our team in Microsoft Teams.</li>
<li><strong>Cloudflare</strong> for spam protection, and <strong>Plausible Analytics</strong> (hosted in the European Union) for aggregate website statistics.</li>
</ul>

<h2>7. The chat assistant</h2>
<p>Our website chat is answered in the first instance by an automated assistant that generates responses using artificial intelligence. Its answers may be incomplete or incorrect and are general information only &mdash; they are not advice, a quote, or a commitment by Onsys. You can ask at any time to be transferred to a person. Conversations are retained so we can follow up your enquiry and improve the service.</p>

<h2>8. Security</h2>
<p>We take reasonable steps to protect personal information from misuse, interference, loss and unauthorised access, modification or disclosure. These include encryption in transit, access controls and role-based permissions, hashed credentials, audit logging, and restricting access to those who need it. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

<h2>9. How long we keep it</h2>
<p>We retain personal information only as long as we need it for the purpose it was collected, to meet our legal and contractual obligations, and to resolve disputes. When it is no longer required we destroy it or de-identify it.</p>

<h2>10. Data breaches</h2>
<p>If we suffer an eligible data breach that is likely to result in serious harm, we will notify affected individuals and the Office of the Australian Information Commissioner (OAIC) as required by the Notifiable Data Breaches scheme.</p>

<h2>11. Accessing and correcting your information</h2>
<p>You may request access to the personal information we hold about you, and ask us to correct it if it is inaccurate, out of date or incomplete. Contact us using the details below. We will respond within a reasonable period, normally 30 days. There is no charge for making a request, though we may charge a reasonable fee for the cost of providing access. If we refuse access or correction we will tell you why in writing.</p>

<h2>12. Marketing and unsubscribing</h2>
<p>We only send marketing communications where you have consented or where it is otherwise permitted under the <em>Spam Act 2003</em> (Cth). Every marketing email includes an unsubscribe link, and you can opt out at any time by contacting us. Opting out of marketing does not stop service-related communications about work we are doing for you.</p>

<h2>13. Complaints</h2>
<p>If you believe we have breached the Australian Privacy Principles, contact our Privacy Officer using the details below. We will acknowledge your complaint and aim to respond within 30 days. If you are not satisfied with our response, you may complain to the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a> or on 1300 363 992.</p>

<h2>14. Children</h2>
<p>Our website and services are directed at businesses and are not intended for anyone under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us and we will delete it.</p>

<h2>15. Third-party websites</h2>
<p>This website links to sites we do not control, including our own product sites and partner sites. We are not responsible for their privacy practices, and we encourage you to read their policies.</p>

<h2>16. Changes to this policy</h2>
<p>We may update this policy to reflect changes in our practices or the law. The current version is always published on this page with its effective date.</p>

<h2>17. Contact us</h2>
<p><strong>Privacy Officer, ${org.legalName}</strong><br />
${org.postalAddress}<br />
Email: <a href="mailto:privacy@${org.email.split("@")[1]}">privacy@${org.email.split("@")[1]}</a><br />
Phone: <a href="tel:${org.phoneE164}">${org.phone}</a></p>
`,
  },
];

const termsBlocks: Block[] = [
  {
    type: 'richText',
    html: `
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE}</p>
<p>These Terms of Use govern your access to and use of onsys.com.au, operated by ${org.legalName} (ABN ${org.abn}, ACN ${org.acn}). By accessing or using this website you agree to be bound by these terms, together with our <a href="/privacy">Privacy Policy</a> and <a href="/disclaimer">Disclaimer</a>. If you do not agree, please do not use the website.</p>

<h2>1. These terms are not a services agreement</h2>
<p>This page governs your use of our <em>website</em>. It does not create any engagement between us and does not entitle you to any service. Services such as managed support, consultancy and projects are supplied only under a separate written agreement &mdash; a proposal, statement of work, service schedule or master services agreement &mdash; signed by both parties. Where anything on this website conflicts with a signed agreement, the signed agreement prevails.</p>

<h2>2. Information on this website is an invitation to enquire</h2>
<p>Prices, plan inclusions, response times and service descriptions published on this website are indicative and are an invitation to treat, not an offer capable of acceptance. They are subject to scoping, availability and a written agreement. Published prices exclude GST unless stated otherwise, and may change without notice.</p>

<h2>3. Permitted use</h2>
<p>You may access and use this website for lawful purposes connected with evaluating or using our services. You may view, print and download extracts for your own internal, non-commercial use, provided you keep all copyright and proprietary notices intact and acknowledge onsys.com.au as the source.</p>

<h2>4. What you must not do</h2>
<ul>
<li>Use the website in breach of any law, or in a way that infringes anyone&rsquo;s rights</li>
<li>Copy, reproduce, republish, sell or commercially exploit any part of the website without our prior written consent</li>
<li>Scrape, harvest or systematically extract content or contact details, or use automated tools to do so</li>
<li>Attempt to gain unauthorised access to the website, any account, or any system or network connected to it</li>
<li>Introduce malicious code, or interfere with the operation, security or availability of the website</li>
<li>Submit false, misleading or abusive content through our forms or chat, or impersonate another person</li>
<li>Use our contact channels to send unsolicited commercial messages</li>
</ul>

<h2>5. Enquiries, submissions and chat</h2>
<p>When you send us an enquiry or use the chat assistant, you confirm that the information you provide is accurate and that you are entitled to provide it. Do not submit confidential information, credentials, or personal information about other people through these channels &mdash; they are not a secure channel for that purpose. We handle what you send us in accordance with our <a href="/privacy">Privacy Policy</a>.</p>
<p>You grant us permission to use the content of your enquiry for the purpose of responding to it and providing services. We may retain correspondence for our records.</p>

<h2>6. The chat assistant</h2>
<p>Chat responses are generated by an automated system using artificial intelligence. They are general information only, may be inaccurate or out of date, and do not constitute advice, a quote, a service commitment or a binding statement by Onsys. Nothing said by the assistant varies these terms or any agreement between us. You may request a person at any time.</p>

<h2>7. Accounts and credentials</h2>
<p>Some areas of this website require an account. You are responsible for keeping your credentials secure and for all activity under your account. Tell us immediately if you suspect unauthorised access. We may suspend or terminate an account at any time where we reasonably believe these terms have been breached.</p>

<h2>8. Intellectual property</h2>
<p>All content on this website &mdash; text, graphics, logos, layout, code and the compilation of it &mdash; is owned by or licensed to ${org.legalName} and is protected by Australian and international copyright law. &copy; ${org.legalName}. All rights reserved.</p>
<p>Except as expressly permitted in clause 3, no licence or right is granted to you in any of our intellectual property. Third-party trademarks, product names and certification badges shown on this website remain the property of their respective owners and are used to identify those products and credentials.</p>

<h2>9. Third-party links and products</h2>
<p>This website links to third-party websites and describes third-party products, including products we partner on. We do not control those sites or products, and we do not accept responsibility for their content, availability, security, or the terms on which they are supplied. Any dealings you have with a third party are between you and that party.</p>

<h2>10. Availability</h2>
<p>We take reasonable steps to keep the website available, but we do not warrant that it will be uninterrupted, timely, secure or error-free. We may change, suspend or withdraw all or part of the website, or any content on it, at any time without notice.</p>

<h2>11. Disclaimers and liability</h2>
<p>Nothing in these terms excludes, restricts or modifies any guarantee, right or remedy you have under the <em>Australian Consumer Law</em> or any other law that cannot lawfully be excluded.</p>
<p>Subject to that, and to the fullest extent permitted by law: the website and its content are provided on an &ldquo;as is&rdquo; basis without warranties of any kind; we exclude all implied terms and warranties; and we are not liable for any indirect, incidental, special or consequential loss, or for loss of profits, revenue, data, goodwill or business opportunity, arising out of or in connection with your use of this website. Where our liability cannot be excluded but can be limited, our liability is limited to re-supplying the relevant information or paying the cost of having it re-supplied.</p>

<h2>12. Indemnity</h2>
<p>You indemnify Onsys against any claim, loss, damage or expense we suffer arising from your breach of these terms, your misuse of the website, or your infringement of the rights of any other person.</p>

<h2>13. Privacy</h2>
<p>Our collection and handling of personal information is governed by our <a href="/privacy">Privacy Policy</a>, which forms part of these terms.</p>

<h2>14. Changes to these terms</h2>
<p>We may amend these terms at any time by publishing an updated version on this page with a revised effective date. Your continued use of the website after that date constitutes acceptance of the amended terms.</p>

<h2>15. Governing law</h2>
<p>These terms are governed by the laws of the State of Victoria, Australia. You and Onsys submit to the non-exclusive jurisdiction of the courts of Victoria and the courts competent to hear appeals from them.</p>

<h2>16. General</h2>
<p>If any provision of these terms is found to be unenforceable, it is severed and the remaining provisions continue in force. Our failure to enforce a provision is not a waiver of it.</p>

<h2>17. Contact</h2>
<p><strong>${org.legalName}</strong><br />
${org.postalAddress}<br />
Email: <a href="mailto:${org.email}">${org.email}</a><br />
Phone: <a href="tel:${org.phoneE164}">${org.phone}</a></p>
`,
  },
];

const disclaimerBlocks: Block[] = [
  {
    type: 'richText',
    html: `
<p><strong>Effective date:</strong> ${LEGAL_EFFECTIVE}</p>
<p>By accessing or using this website you agree to be bound by this Disclaimer, together with our <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.</p>

<h2>1. General information only</h2>
<p>The content on this website is provided for general information purposes only. While Onsys Technologies Pty Ltd endeavours to keep it accurate and current, we make no representation or warranty, express or implied, about:</p>
<ul>
<li>the completeness, accuracy, currency or reliability of any content on this website</li>
<li>the suitability or availability of any service, product or information described here for any particular purpose</li>
</ul>
<p>Any reliance you place on this content is at your own risk. You should make your own enquiries and obtain advice specific to your circumstances before acting.</p>

<h2>2. Not professional advice</h2>
<p>Nothing on this website constitutes technical, security, legal, financial or professional advice, and nothing here creates a consultant-client relationship. Advice specific to your environment is provided only under a signed engagement.</p>

<h2>3. Technical content, code and commands</h2>
<p>Our articles, guides and knowledge base contain technical instructions, configuration examples, scripts and database commands. These are illustrative and are written for a general audience without knowledge of your environment.</p>
<p><strong>Do not run commands from this website against a production system.</strong> Commands that are safe in one environment can cause outage, data loss or irreversible change in another. Always review the instructions, understand what they do, test in a non-production environment, and confirm you have a verified, restorable backup first. To the fullest extent permitted by law, Onsys accepts no liability for any loss or damage arising from the use of technical content published on this website.</p>

<h2>4. Automated and AI-generated responses</h2>
<p>Our website chat produces responses using artificial intelligence. Those responses may be incomplete, out of date or incorrect, and must not be relied on as advice or as a commitment by Onsys. Verify anything material with one of our consultants before acting on it.</p>

<h2>5. Pricing and service descriptions</h2>
<p>Prices, plan inclusions and response times published on this website are indicative, exclude GST unless stated otherwise, and are subject to scoping and a written agreement. They may change without notice. The terms that apply to any service are those in your signed agreement with us.</p>

<h2>6. Limitation of liability</h2>
<p>Nothing in this Disclaimer excludes, restricts or modifies any guarantee, right or remedy that cannot lawfully be excluded, including under the <em>Australian Consumer Law</em> and the <em>Competition and Consumer Act 2010</em> (Cth).</p>
<p>Subject to that, and to the fullest extent permitted by law, ${org.legalName} is not liable for any direct, indirect or consequential loss &mdash; including loss of profits, data, revenue or business opportunity &mdash; arising from your access to, use of, or reliance on this website or its content.</p>

<h2>7. External links</h2>
<p>This website contains links to third-party websites. We have no control over their content, availability or security, and we do not endorse or accept responsibility for third-party views, products or services. Review the terms and privacy policies of those sites before using them.</p>

<h2>8. Website availability</h2>
<p>We take reasonable steps to keep this website operational, but we are not responsible and will not be liable for interruption or unavailability caused by technical issues, maintenance or events beyond our reasonable control.</p>

<h2>9. Copyright</h2>
<p>This website and its contents are the copyright of ${org.legalName}. All rights reserved.</p>
<ul>
<li>You may print or download extracts for personal, non-commercial use.</li>
<li>You may share limited extracts with others for personal use, provided you acknowledge onsys.com.au as the source.</li>
<li>You may not reproduce, distribute, commercially exploit, transmit or store this content in any other website or retrieval system without our prior written consent.</li>
</ul>

<h2>10. Trademarks</h2>
<p>Microsoft SQL Server, Windows and the Windows logo are trademarks of the Microsoft group of companies. Oracle and Java are registered trademarks of Oracle Corporation and/or its affiliates. All other product names, logos, brands and certification badges are the property of their respective owners, and are used on this website only to identify those products and the credentials our engineers hold.</p>

<h2>11. Updates</h2>
<p>This Disclaimer may be updated from time to time to reflect legal or business changes. The current version is always published on this page with its effective date.</p>

<h2>12. Contact</h2>
<p><strong>${org.legalName}</strong><br />
${org.postalAddress}<br />
Email: <a href="mailto:${org.email}">${org.email}</a><br />
Phone: <a href="tel:${org.phoneE164}">${org.phone}</a></p>
`,
  },
];

/**
 * Managed IT services, from onsys.com.au/managed-it-services.
 *
 * The live page repeats the three SMB plans in full, which already live on the
 * pricing page. They are summarised here and linked rather than duplicated, so
 * the inclusions have one source of truth and cannot drift apart.
 */
const managedItBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'what-we-manage',
    eyebrow: 'What we manage',
    heading: 'Six disciplines, one accountable team',
    body: 'A seamless, secure IT platform is not one service — it is six that have to work together. We run all of them, so nothing falls between suppliers.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'Network monitoring & management',
        body: 'Real-time visibility into network performance, with proactive monitoring that identifies and resolves issues before they reach your staff.',
        icon: '#s-etl',
        coverColor: '#EAF1FB',
        tag: 'Cacti / Zabbix',
      },
      {
        title: 'Server management',
        body: 'Server administration for performance and uptime — regular maintenance, updates and patch management to close vulnerabilities before they are exploited.',
        icon: '#s-managed',
        coverColor: '#FFF1E0',
        tag: 'Patched & maintained',
      },
      {
        title: 'Endpoint security',
        body: 'Endpoint protection against evolving threats, security policies that prevent data breaches, and regular audits so your posture does not quietly decay.',
        icon: '#s-shield',
        coverColor: '#E7F5EC',
        tag: 'Audited regularly',
      },
      {
        title: 'Backup & recovery',
        body: 'Backup covering your critical data, swift recovery when something goes wrong, and regular restoration testing — because an untested backup is a guess.',
        icon: '#s-ha',
        coverColor: '#F3F2F1',
        tag: 'Restore-tested',
      },
      {
        title: 'IT consultancy',
        body: 'Strategic planning aligned to your business objectives, technology roadmaps built for growth, and advice on where new technology is actually worth adopting.',
        icon: '#s-consult',
        coverColor: '#EAF1FB',
        tag: 'Roadmap & strategy',
      },
      {
        title: '24/7 helpdesk',
        body: 'A responsive service desk around the clock, resolving issues quickly to minimise downtime — plus user support and training to lift IT literacy across your team.',
        icon: '#s-emergency',
        coverColor: '#FFF1E0',
        tag: 'Around the clock',
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'whats-covered',
    eyebrow: 'Day to day',
    heading: 'What sits inside a managed IT plan',
    body: 'Every plan covers the estate a growing business actually runs — not a narrow definition of "IT support" that leaves the hard parts out of scope.',
    items: [
      'End-user support across Windows 10/11 and macOS, with a defined monthly ticket allowance',
      'Firewalls, network switches, WiFi access points and controllers',
      'Servers and virtual machines, on-premises or in the cloud, plus NAS, SAN and VMware',
      'Microsoft 365 — Exchange Online, Teams, OneDrive, SharePoint and Entra ID',
      'File share and print services, including file servers and network printers',
      'Patch management across laptops, desktops, servers and network equipment',
      'Backup infrastructure or Backup-as-a-Service, with annual restoration testing on higher tiers',
      'Monitoring and alerting, moving from reactive to proactive as you scale up the tiers',
      'Service management reporting, with Power BI dashboards and quarterly business reviews at Premium',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Entry plan', value: '$4,500 / month' },
        { label: 'Covers', value: 'Up to 30 users' },
        { label: 'Larger tiers', value: '100 and 200 users' },
        { label: 'Service desk', value: 'SummitAI ITSM' },
        { label: 'Monitoring', value: 'Cacti / Zabbix' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'plans',
    eyebrow: 'Plans',
    heading: 'Three tiers, priced on your headcount',
    body: 'Pick the tier that matches your user count and the level of monitoring you need. Full inclusions for every plan are published on our pricing page.',
    centered: true,
    altBackground: false,
    columns: 3,
    cards: [
      {
        title: 'Basic SMB',
        body: 'Australian business-hours support, 25 tickets a month, single-site infrastructure, Microsoft 365 and reactive monitoring with email alerts.',
        tag: '$4,500/mo · to 30 users',
        link: { label: 'Full inclusions', href: '/pricing-and-plans#managed-it-plans' },
      },
      {
        title: 'Advanced SMB',
        body: 'Faster resolution, 75 tickets a month, multi-site infrastructure, Entra ID and Security & Compliance Center, patch management and 24×7 reactive monitoring.',
        tag: 'POA · to 100 users',
        link: { label: 'Full inclusions', href: '/pricing-and-plans#managed-it-plans' },
      },
      {
        title: 'Premium SMB',
        body: '24×7 support with priority response, 120 tickets, proactive performance and capacity monitoring, compliance reporting, Power BI dashboards and quarterly reviews.',
        tag: 'POA · to 200 users',
        link: { label: 'Full inclusions', href: '/pricing-and-plans#managed-it-plans' },
      },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'why-onsys',
    eyebrow: 'Why Onsys',
    heading: 'Why businesses hand us their IT',
    centered: true,
    altBackground: true,
    columns: 4,
    cards: [
      { title: 'Experience', body: 'Years of running production estates across on-premises, Oracle, AWS and Azure infrastructure — not a helpdesk learning on your systems.' },
      { title: 'Customised solutions', body: 'Plans are a starting point. Tiers are scoped to your user count, site count and device mix, then quoted as a fixed monthly fee.' },
      { title: 'Reliability', body: 'Monitoring, patching and restore-tested backup, backed by SLAs and a service desk your staff can actually reach.' },
      { title: 'Scalability', body: 'Move up a tier as headcount grows, without re-platforming your tooling or renegotiating who does what.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Let us take IT off your plate',
    body: 'Tell us your headcount, sites and what is currently breaking. We will come back with a tier, a fixed monthly price and what it covers — at no cost.',
    cta: { label: 'Get a Managed IT Quote', href: '/contact' },
  },
];

/**
 * Cloud pages, built from onsys.com.au/{aws-migration-and-consultancy,
 * azure-solutions,oracle-cloud-consultancy}.
 *
 * Those three are the same page with the vendor name substituted — 72% of lines
 * are byte-identical, and the substitution missed several spots (the AWS page
 * offers to "build a secured Azure landing zone"). Three near-duplicates
 * competing for overlapping terms is worse than two distinct ones, so the
 * content is split by what the client is buying — deciding and running (cloud
 * consultancy) versus moving (cloud migrations) — and the cloud platform
 * becomes a detail inside each, not the organising principle.
 */
const cloudConsultancyBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'services',
    eyebrow: 'Before, during and after',
    heading: 'Cloud decisions are cheaper to get right than to undo',
    body: 'Most cloud regret traces back to a decision made early without enough information — the wrong landing zone, an identity model that will not scale, a bill nobody forecast. This is the work that prevents it.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'Cloud strategy & roadmap',
        body: 'Where cloud helps your business and where it does not, sequenced into a roadmap with the dependencies and risks identified before budget is committed.',
        icon: '#s-consult',
        coverColor: '#EAF1FB',
        tag: 'Strategy first',
      },
      {
        title: 'Cost modelling & FinOps',
        body: 'What it will actually cost to migrate, run and operate — modelled up front, then reduced afterwards. Our FinOps practice exists to bring the monthly bill down.',
        icon: '#s-etl',
        coverColor: '#FFF1E0',
        tag: 'Cut the bill',
      },
      {
        title: 'Architecture & landing zone',
        body: 'A secured landing zone designed for your workloads and compliance obligations, so the first thing you deploy is not also the first thing you have to rebuild.',
        icon: '#s-cloud',
        coverColor: '#E7F5EC',
        tag: 'Built to grow',
      },
      {
        title: 'Identity & security by design',
        body: 'Identity platform planning and integration, IAM and RBAC, Key Vault and secrets management, WAF and Zero Trust design — decided at the start, not retrofitted.',
        icon: '#s-shield',
        coverColor: '#F3F2F1',
        tag: 'Zero Trust',
      },
      {
        title: 'DevOps & automation',
        body: 'CI/CD pipelines, infrastructure as code with Terraform and Ansible, and monitoring — so environments are reproducible rather than hand-built and undocumented.',
        icon: '#s-code',
        coverColor: '#EAF1FB',
        tag: 'Terraform · CI/CD',
      },
      {
        title: 'Ongoing cloud support',
        body: 'Round-the-clock monitoring, troubleshooting and optimisation once you are live, at $150 per hour or under a managed plan.',
        icon: '#s-managed',
        coverColor: '#FFF1E0',
        tag: '24/7 available',
        link: { label: 'See support rates', href: '/pricing-and-plans#consultancy-rates' },
      },
    ],
  },
  {
    type: 'platformChips',
    eyebrow: 'Platforms',
    heading: 'Vendor-neutral, because we hold credentials across all three',
    body: 'We are not incentivised to land you on one platform. The recommendation follows your workloads, your licensing position and your team.',
    groups: [
      {
        title: 'Microsoft Azure',
        chips: [
          { label: 'Landing zone & governance', color: '#0078D4' },
          { label: 'Entra ID & identity', color: '#0063B1' },
          { label: 'Azure SQL & Managed Instance', color: '#00A4EF' },
          { label: 'App Services & Functions', color: '#0078D4' },
          { label: 'Microsoft Sentinel', color: '#0E336A' },
        ],
      },
      {
        title: 'Amazon Web Services',
        chips: [
          { label: 'Landing zone & control tower', color: '#FF9900' },
          { label: 'IAM & security groups', color: '#D97706' },
          { label: 'RDS & database services', color: '#FF9900' },
          { label: 'Application modernisation', color: '#D97706' },
        ],
      },
      {
        title: 'Oracle Cloud (OCI)',
        chips: [
          { label: 'OCI solution design', color: '#C74634' },
          { label: 'Autonomous Database', color: '#C74634' },
          { label: 'Cloud-native deployment', color: '#8A5A44' },
          { label: 'Reduce TCO on Oracle estates', color: '#C74634' },
        ],
      },
    ],
    sidebar: {
      title: 'How we charge',
      items: [
        'Advisory and support at $150 per hour, four-hour minimum.',
        'Defined-scope work quoted as a fixed price with milestone payments.',
        'Ongoing management available under a monthly managed plan.',
      ],
    },
  },
  {
    type: 'checkList',
    anchor: 'readiness',
    eyebrow: 'Where most engagements start',
    heading: 'Cloud readiness assessment',
    body: 'A short, fixed-scope engagement that tells you what moving would involve, what it would cost and what would break. It is the cheapest way to de-risk everything that follows.',
    items: [
      'Develop a cloud strategy and define the roadmap',
      'Discover and analyse your existing workloads',
      'Cost comparison and optimisation modelling',
      'Identify the risks and the dependencies that bite during cutover',
      'Design the landing zone and the identity platform',
      'Prioritise workloads into migration waves',
      'Implement proof of concepts where the risk warrants proving it first',
    ],
    sidebar: {
      title: 'What you walk away with',
      rows: [
        { label: 'Deliverable', value: 'Written assessment' },
        { label: 'Includes', value: 'Roadmap & cost model' },
        { label: 'Engagement', value: 'Fixed price' },
        { label: 'Obligation', value: 'None to proceed' },
        { label: 'First call', value: 'Free' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'delivery-standards',
    eyebrow: 'On every engagement',
    heading: 'How we deliver',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Two specialists, minimum', body: 'At least two consultants on every project, so nothing stalls because one person is on leave.', tag: 'No single point of failure' },
      { title: 'Peer-reviewed', body: 'A peer review at each stage means a second senior engineer checks the work before it reaches your environment.', tag: 'Reviewed at each stage' },
      { title: 'Documented', body: 'Comprehensive design, build and operational documents, so your team can run what we hand over.', tag: 'Design, build, operate' },
      { title: 'Weekly reporting', body: 'Weekly project reporting and billing on time-and-materials work — no surprises at invoice time.', tag: 'Weekly cadence' },
      { title: 'Cost optimisation', body: 'Our FinOps practice reviews the bill after go-live and reduces it, rather than leaving it to grow quietly.', tag: 'FinOps' },
      { title: 'Milestone-based', body: 'Flexible, cost-effective, milestone-based projects that let you manage budget against delivered outcomes.', tag: 'Pay on delivery', link: { label: 'See pricing', href: '/pricing-and-plans' } },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Not sure whether cloud is the right move?',
    body: 'That is a fine place to start. Book a free call with a cloud architect — if the honest answer is that your workload should stay where it is, we will tell you.',
    cta: { label: 'Book a Free Consultation', href: '/contact' },
  },
];

const cloudMigrationBlocks: Block[] = [
  {
    type: 'steps',
    eyebrow: 'The method',
    heading: 'Five waves, and a rollback plan at every one',
    body: 'Migration failures are rarely technical surprises — they are dependencies nobody mapped and cutovers nobody rehearsed. This sequence exists to remove both.',
    steps: [
      { title: 'Discover & analyse', body: 'Inventory the workloads, map the dependencies between them, and find the integrations that only reveal themselves at cutover.' },
      { title: 'Design the target', body: 'Secured landing zone, identity platform and network design on the destination cloud, sized against the workloads actually moving.' },
      { title: 'Prioritise into waves', body: 'Sequence workloads by risk and dependency so the first move is the one that teaches you most at the lowest cost.' },
      { title: 'Rehearse & migrate', body: 'Prove the approach with a proof of concept, then execute each wave inside an agreed window with a tested rollback path.' },
      { title: 'Validate & optimise', body: 'Application testing, performance tuning against cloud-native scaling, and a FinOps review so month one does not deliver a bill shock.' },
    ],
  },
  {
    type: 'platformChips',
    anchor: 'paths',
    eyebrow: 'Migration paths',
    heading: 'Routes we have run before',
    body: 'These are established paths with known pitfalls, not exploratory work. Most have been executed on production estates under a fixed price.',
    groups: [
      {
        title: 'Database migrations',
        chips: [
          { label: 'SQL Server → Azure SQL', color: '#0078D4' },
          { label: 'SQL Server → Azure SQL MI', color: '#0063B1' },
          { label: 'Oracle → EDB Postgres', color: '#336791' },
          { label: 'Oracle cross-platform', color: '#C74634' },
          { label: 'On-premises → Amazon RDS', color: '#FF9900' },
          { label: 'MySQL & PostgreSQL to managed services', color: '#00758F' },
        ],
      },
      {
        title: 'Infrastructure & application moves',
        chips: [
          { label: 'On-premises → Microsoft Azure', color: '#0078D4' },
          { label: 'On-premises → AWS', color: '#FF9900' },
          { label: 'On-premises → Oracle Cloud (OCI)', color: '#C74634' },
          { label: 'JD Edwards → OCI', color: '#8A5A44' },
          { label: 'Lift-and-shift or re-platform', color: '#605E5C' },
          { label: 'Application modernisation', color: '#0E7C4A' },
        ],
      },
      {
        title: 'What we build on arrival',
        chips: [
          { label: 'Secured landing zone', color: '#0E336A' },
          { label: 'Identity platform integration', color: '#1E529D' },
          { label: 'Geo-replication & DR', color: '#0E7C4A' },
          { label: 'Backup & recovery strategy', color: '#605E5C' },
          { label: 'Monitoring & alerting', color: '#FF8B00' },
        ],
      },
    ],
  },
  {
    type: 'checkList',
    anchor: 'minimising-downtime',
    eyebrow: 'The part that worries you',
    heading: 'How we keep downtime out of the migration',
    body: 'Every client asks the same first question. The answer is not a promise — it is a set of practices that make the cutover window small and reversible.',
    items: [
      'Dependency analysis before planning, so nothing is discovered on cutover night',
      'Workloads prioritised into waves rather than moved in one high-risk event',
      'Replication or log shipping to keep the target in sync ahead of the switch',
      'A rehearsed cutover with a tested rollback path, agreed before the window opens',
      'Execution inside an agreed change window under ITIL change management',
      'Failover and application testing to confirm the outcome rather than assume it',
      'Post-migration monitoring and support while the new environment settles',
    ],
    sidebar: {
      title: 'Commercials',
      rows: [
        { label: 'Defined scope', value: 'Fixed price' },
        { label: 'Payments', value: 'Milestone-based' },
        { label: 'Open scope', value: '$150 / hour' },
        { label: 'Assessment', value: 'Fixed price' },
        { label: 'Scoping call', value: 'Free' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'why-onsys',
    eyebrow: 'Why us for a migration',
    heading: 'Four things that decide whether a migration goes well',
    centered: true,
    altBackground: true,
    columns: 4,
    cards: [
      { title: 'Faster delivery', body: 'Established migration paths and a team that has run them before, rather than a plan being invented against your deadline.' },
      { title: 'Cost savings', body: 'Cost modelled before you commit and optimised after you land — including licence reduction routes like Oracle to EDB.' },
      { title: 'Certified experts', body: 'Consultants certified across Azure, AWS and Oracle Cloud, so the destination is chosen on merit rather than familiarity.' },
      { title: 'Database depth', body: 'Migrations usually fail at the data tier. That is the layer we have run for two decades — it is our home ground, not a subcontract.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Thinking about a move this year?',
    body: 'Start with a cloud readiness assessment. You get the workload inventory, the cost model and the risk list before committing to anything — for a fixed price.',
    cta: { label: 'Book a Free Scoping Call', href: '/contact' },
  },
];

/**
 * System administration, from onsys.com.au/system-administration.
 *
 * The source groups twelve services under four platforms; kept that structure
 * because it maps to how clients think about the work, but each card now names
 * the outcome rather than restating the service name back at the reader.
 */
const sysAdminBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'what-we-administer',
    eyebrow: 'What we administer',
    heading: 'The four platforms every business runs on',
    body: 'System administration is the work nobody notices until it stops happening. We handle Windows, Linux, Microsoft 365 and identity so your team can get on with the business.',
    centered: true,
    altBackground: true,
    columns: 2,
    cards: [
      {
        title: 'Windows Server',
        body: 'Installation, configuration and ongoing maintenance; Active Directory for secure authentication, authorisation and central management; and patch management that keeps systems current rather than a year behind.',
        icon: '#s-managed',
        coverColor: '#EAF1FB',
        tag: 'AD · patching · builds',
      },
      {
        title: 'Linux',
        body: 'Server configuration tailored to your workloads, security hardening against real threat models rather than a generic checklist, and performance tuning with monitoring so problems surface before users report them.',
        icon: '#s-consult',
        coverColor: '#FFF1E0',
        tag: 'RHEL · Ubuntu · CentOS',
      },
      {
        title: 'Microsoft 365',
        body: 'Exchange Online administration, getting genuine value from Teams, SharePoint and OneDrive, and licence management that stops you paying for seats and tiers nobody uses.',
        icon: '#s-cloud',
        coverColor: '#E7F5EC',
        tag: 'Exchange · Teams · licensing',
      },
      {
        title: 'Identity & access',
        body: 'Role-based access control so sensitive systems are reachable only by those who need them, account provisioning from onboarding through offboarding, and password policy backed by regular audits.',
        icon: '#s-shield',
        coverColor: '#F3F2F1',
        tag: 'RBAC · joiners & leavers',
      },
    ],
  },
  {
    type: 'platformChips',
    anchor: 'platforms',
    eyebrow: 'Coverage',
    heading: 'Operating systems and directories we support',
    body: 'Current releases and the legacy estate you have not been able to retire yet — both need administering, and only one of them is interesting.',
    groups: [
      {
        title: 'Windows & directory',
        chips: [
          { label: 'Windows Server 2016 – 2022', color: '#00A4EF' },
          { label: 'Windows Server 2012 and below', color: '#605E5C' },
          { label: 'Active Directory', color: '#0078D4' },
          { label: 'Entra ID', color: '#0063B1' },
          { label: 'Group Policy', color: '#0E336A' },
        ],
      },
      {
        title: 'Linux & UNIX',
        chips: [
          { label: 'RHEL & CentOS', color: '#EE0000' },
          { label: 'Ubuntu', color: '#E95420' },
          { label: 'Oracle Linux', color: '#C74634' },
          { label: 'Solaris & AIX', color: '#605E5C' },
          { label: 'HP-UX', color: '#607078' },
        ],
      },
      {
        title: 'Identity & web services',
        chips: [
          { label: 'LDAP & Keycloak', color: '#0E7C4A' },
          { label: 'Nginx & HAProxy', color: '#0E336A' },
          { label: 'Apache & Tomcat', color: '#8A5A44' },
          { label: 'Microsoft 365', color: '#0078D4' },
        ],
      },
    ],
    sidebar: {
      title: 'How to engage us',
      items: [
        'Hourly system administration at $150/hr, four-hour minimum.',
        'Included in managed IT plans from $4,500 per month.',
        'Fixed price for defined work such as a domain migration.',
      ],
    },
  },
  {
    type: 'checkList',
    anchor: 'tasks',
    eyebrow: 'Typical work',
    heading: 'What clients actually ask us to do',
    body: 'Some of it is scheduled, some of it lands on a Friday afternoon. Both are covered.',
    items: [
      'Build, configure and commission new servers',
      'Run the monthly patch cycle across servers and workstations',
      'Active Directory health, cleanup and domain migrations',
      'Onboard and offboard staff, with access revoked the same day',
      'Harden a server before it faces the internet',
      'Diagnose why a system has become slow and fix the cause',
      'Review Microsoft 365 licensing and cut what is not used',
      'Implement RBAC and tighten password policy after an audit finding',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Hourly rate', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'In a plan', value: 'From $4,500 / month' },
        { label: 'After hours', value: 'Available' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'why-onsys',
    eyebrow: 'Why Onsys',
    heading: 'Why hand this over',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Expertise', body: 'Extensive experience across Windows, Linux, UNIX and Microsoft 365 — the estate administered by specialists, not by whoever is free.' },
      { title: 'Reliability', body: 'Your infrastructure kept secure and available, with patching and monitoring that happen on schedule rather than when someone remembers.' },
      { title: 'Custom solutions', body: 'Services aligned to your organisation’s actual needs and constraints, not a fixed package you have to bend your environment around.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Ready to optimise and secure your infrastructure?',
    body: 'Tell us what you run and where the gaps are. A senior consultant will come back with an honest assessment and what it would take to close them — free.',
    cta: { label: 'Talk to a Consultant', href: '/contact' },
  },
];

/**
 * Network and firewalls, from onsys.com.au/network-and-firewalls.
 *
 * The "what you can engage us for" list is lifted from the request options in
 * that page's callback form — concrete, in the client's own words, and
 * invisible on the live page because it only appears inside a dropdown.
 */
const networkBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'services',
    eyebrow: 'What we do',
    heading: 'Design it properly, then defend it continuously',
    body: 'A network is only as good as the day it was last reviewed. We build architectures that fit the business and keep the edge defended as the threat landscape moves.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Network design & optimisation', body: 'Architectures tailored to your business rather than a reference diagram — one size does not fit all, and an over-engineered network costs as much as an under-built one.', icon: '#s-etl', coverColor: '#EAF1FB', tag: 'Built to fit' },
      { title: 'Firewall configuration & management', body: 'Firewall solutions implemented and then actually managed — rule sets reviewed, changes documented, and drift caught before it becomes an opening.', icon: '#s-shield', coverColor: '#FFF1E0', tag: 'Rules kept clean' },
      { title: 'Intrusion detection & prevention', body: 'Identify and stop threats at the perimeter with IDS and IPS tuned to your traffic, so alerts mean something and staff do not learn to ignore them.', icon: '#s-emergency', coverColor: '#E7F5EC', tag: 'Tuned, not noisy' },
      { title: 'VPN & remote access', body: 'Securely connect remote offices and give staff safe access from anywhere, without turning the VPN concentrator into the thing that takes the business offline.', icon: '#s-cloud', coverColor: '#F3F2F1', tag: 'Site-to-site & remote' },
      { title: 'Traffic analysis & optimisation', body: 'Find what is actually consuming the link, shape it, and give users back the responsiveness they lost — usually cheaper than buying more bandwidth.', icon: '#s-consult', coverColor: '#EAF1FB', tag: 'Before you buy bandwidth' },
      { title: '24/7 monitoring & support', body: 'Our commitment does not end at implementation. Continuous monitoring and round-the-clock support keep the network stable while you run the business.', icon: '#s-managed', coverColor: '#FFF1E0', tag: 'Around the clock', link: { label: 'See managed IT plans', href: '/managed-it-services' } },
    ],
  },
  {
    type: 'platformChips',
    anchor: 'vendors',
    eyebrow: 'Vendors',
    heading: 'Hardware and platforms we work across',
    body: 'Multi-vendor by design. We are not reselling a single stack, so the recommendation follows your requirements and your existing estate.',
    groups: [
      {
        title: 'Firewalls & security',
        chips: [
          { label: 'Fortinet', color: '#EE3124' },
          { label: 'Palo Alto Networks', color: '#FA582D' },
          { label: 'Check Point', color: '#E6007E' },
          { label: 'Sophos', color: '#0A3D62' },
          { label: 'Cisco ASA & Firepower', color: '#1BA0D7' },
          { label: 'F5', color: '#E4002B' },
        ],
      },
      {
        title: 'Network infrastructure',
        chips: [
          { label: 'Cisco', color: '#1BA0D7' },
          { label: 'Juniper', color: '#0F6B4C' },
          { label: 'NETGEAR', color: '#0072BC' },
          { label: 'Dell', color: '#007DB8' },
          { label: 'Switching & routing', color: '#605E5C' },
          { label: 'WiFi & controllers', color: '#0E336A' },
        ],
      },
      {
        title: 'Cloud networking',
        chips: [
          { label: 'Azure Firewall', color: '#0078D4' },
          { label: 'AWS security groups', color: '#FF9900' },
          { label: 'OCI network security', color: '#C74634' },
          { label: 'VPC, VNets & transit gateways', color: '#1E529D' },
          { label: 'Load balancers & WAF', color: '#0E7C4A' },
        ],
      },
    ],
    sidebar: {
      title: 'How to engage us',
      items: [
        'Network and firewall support at $150/hr, four-hour minimum.',
        'Included in managed IT plans from $4,500 per month.',
        'Fixed price for defined work such as a firewall replacement.',
      ],
    },
  },
  {
    type: 'checkList',
    anchor: 'engagements',
    eyebrow: 'Common requests',
    heading: 'What you can engage us for',
    body: 'Scheduled project work and the urgent things that arrive without warning — both are covered.',
    items: [
      'Install, configure and support network and firewall infrastructure',
      'Design enterprise network security',
      'Develop and implement firewall rule requirements',
      'Perform maintenance and changes on firewalls and network devices',
      'Troubleshoot and resolve network connectivity issues',
      'Investigate and respond to network security incidents',
      'Request an estimate for upcoming project work',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Hourly rate', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'Monitoring', value: '24 / 7 available' },
        { label: 'In a plan', value: 'From $4,500 / month' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'why-onsys',
    eyebrow: 'Why Onsys',
    heading: 'Why businesses trust us with the perimeter',
    centered: true,
    altBackground: true,
    columns: 4,
    cards: [
      { title: 'Tailored architecture', body: 'One size does not fit all. Network architecture is aligned to your requirements and optimised for the traffic you actually carry.' },
      { title: 'Security first', body: 'Modern firewall solutions that shield the network from evolving threats and keep digital assets fortified against unauthorised access.' },
      { title: 'Scalable', body: 'The Australian business landscape is dynamic. Services scale with growth without compromising security or performance.' },
      { title: 'Always monitored', body: 'Continuous monitoring and round-the-clock support, so stability does not depend on someone noticing.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Is your firewall rule set still the one you inherited?',
    body: 'Most are. Book a free call and we will review where your network and perimeter stand, and what is worth fixing first.',
    cta: { label: 'Book a Network Review', href: '/contact' },
  },
];

/**
 * Virtualisation and storage, from onsys.com.au/virtualization-and-storage.
 *
 * The source page is titled "Virtualization and Storage" but contains no
 * storage content whatsoever — not one mention of storage, SAN, NAS or backup.
 * The storage half is written here from the storage administration capability
 * Onsys already publishes on its pricing page, so the page delivers what its
 * title promises.
 */
const virtStorageBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'virtualisation',
    eyebrow: 'Virtualisation services',
    heading: 'Consolidate the estate, cut the hardware bill',
    body: 'Virtualisation reduces the complexity and cost of traditional hardware-based environments — but only when it is sized, configured and maintained properly. That is the whole engagement.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Assessment & architecture', body: 'Evaluate the existing estate for virtualisation opportunities, assess readiness, then design an architecture aligned to your business goals rather than a vendor template.', icon: '#s-consult', coverColor: '#EAF1FB', tag: 'Start here' },
      { title: 'Installation & configuration', body: 'Set up hypervisors, configure virtual machines and integrate the platform into your existing environment without disturbing what is already running.', icon: '#s-managed', coverColor: '#FFF1E0', tag: 'Build' },
      { title: 'Capacity planning', body: 'Analyse resource utilisation and model future growth, so you buy the capacity you will need rather than the capacity you happened to have.', icon: '#s-etl', coverColor: '#E7F5EC', tag: 'Right-sized' },
      { title: 'Migration & upgrades', body: 'Move from older VMware or another hypervisor onto current versions, and keep up with releases — planned and executed to minimise downtime and disruption.', icon: '#s-ha', coverColor: '#F3F2F1', tag: 'Minimal downtime' },
      { title: 'Performance & health checks', body: 'Find and resolve bottlenecks, audit the health of the environment, and remediate what the audit turns up rather than filing it.', icon: '#s-cloud', coverColor: '#EAF1FB', tag: 'Audited' },
      { title: 'Support & patching', body: 'Ongoing technical support to troubleshoot and optimise, with patch management keeping hypervisors current for security and performance.', icon: '#s-shield', coverColor: '#FFF1E0', tag: 'Ongoing' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'storage',
    eyebrow: 'Storage administration',
    heading: 'The storage half, which usually gets forgotten',
    body: 'Virtual machines are only as fast and as safe as the storage beneath them. We administer the array as deliberately as the hypervisor.',
    items: [
      'Configuration and provisioning across enterprise arrays',
      'Performance tuning where latency is the real cause of a slow application',
      'Patching, firmware and controlled upgrades',
      'Replication between sites for disaster recovery',
      'Capacity monitoring, so you are not surprised by a full volume on a Friday',
      'Backup platform administration across Veeam and Commvault',
      'Troubleshooting FC, iSCSI, NFS and CIFS connectivity problems',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Hourly rate', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'In a plan', value: 'From $4,500 / month' },
        { label: 'Defined scope', value: 'Fixed price' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'platformChips',
    anchor: 'platforms',
    eyebrow: 'Platforms',
    heading: 'Hypervisors and arrays we work across',
    body: 'Flexibility without compromise — the platform is chosen on merit and licensing position, not because it is the one we happen to resell.',
    groups: [
      {
        title: 'Hypervisors',
        chips: [
          { label: 'VMware vSphere & ESXi', color: '#607078' },
          { label: 'Microsoft Hyper-V', color: '#0078D4' },
          { label: 'Oracle Linux KVM', color: '#C74634' },
          { label: 'Citrix', color: '#452170' },
        ],
      },
      {
        title: 'Storage arrays',
        chips: [
          { label: 'NetApp', color: '#0067C5' },
          { label: 'Dell EMC', color: '#007DB8' },
          { label: 'HPE', color: '#01A982' },
          { label: 'Hitachi', color: '#E60027' },
          { label: 'IBM', color: '#0F62FE' },
          { label: 'Oracle Database Appliance', color: '#C74634' },
        ],
      },
      {
        title: 'Protocols & backup',
        chips: [
          { label: 'Fibre Channel & iSCSI', color: '#605E5C' },
          { label: 'NFS & CIFS', color: '#0E336A' },
          { label: 'Veeam', color: '#00B159' },
          { label: 'Commvault', color: '#0B5FFF' },
          { label: 'SAN & NAS', color: '#607078' },
        ],
      },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'why-onsys',
    eyebrow: 'Why Onsys',
    heading: 'Three platforms, no favourites',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'VMware', body: 'A seamless transition to a virtualised environment that optimises your resources and improves operational agility — from hypervisor build through to ongoing health.' },
      { title: 'KVM', body: 'Flexibility without compromise. Oracle Linux KVM delivers cost-effective, adaptable virtualisation, which matters most when licence cost is the constraint.' },
      { title: 'Hyper-V', body: 'Microsoft Hyper-V for scalability and reliability, and the obvious choice where your estate and licensing are already Microsoft-centric.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Paying for hardware you no longer need?',
    body: 'A virtualisation assessment tells you what can be consolidated, what it would save and what the migration would involve. Book a free scoping call to start.',
    cta: { label: 'Book a Free Assessment', href: '/contact' },
  },
];

/**
 * Custom software development, from onsys.com.au/offshore-software-development.
 *
 * The source leads with "offshore" — a delivery model, not what the client is
 * buying. Reframed to lead with the outcome and treat offshore-with-Melbourne-
 * governance as the differentiator it actually is. Mobile is split onto its own
 * page; this one keeps web, SaaS, backend and modernisation.
 */
const customSoftwareBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'what-we-build',
    eyebrow: 'What we build',
    heading: 'Built fast. Built secure. Built to scale.',
    body: 'We design, build, modernise and integrate web, mobile and cloud software that drives real outcomes — faster operations, better customer experience and measurable ROI.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Custom web applications', body: 'Customer portals, SaaS platforms and the internal systems that run your operation — built around your process instead of forcing your process around a product.', icon: '#s-code', coverColor: '#EAF1FB', tag: 'Portals & SaaS' },
      { title: 'Backend & APIs', body: 'Microservices, integrations and secure data access designed so the next team to touch the codebase can understand it without an archaeology project.', icon: '#s-etl', coverColor: '#FFF1E0', tag: 'Microservices' },
      { title: 'Application modernisation', body: 'Legacy rebuilds, cloud migration and performance uplift for systems that still run the business but no longer deserve to be feared.', icon: '#s-ha', coverColor: '#E7F5EC', tag: 'Legacy rebuilds' },
      { title: 'System integration', body: 'API, SOAP, SSIS, WSO2 and event-driven patterns that get your platforms talking to each other reliably.', icon: '#s-consult', coverColor: '#F3F2F1', tag: 'Connected', link: { label: 'Integration services', href: '/integration-services' } },
      { title: 'AI-enabled features', body: 'LLM assistants, workflow automation and document intelligence built into the product, rather than bolted on as a demo that never ships.', icon: '#s-shield', coverColor: '#EAF1FB', tag: 'LLM & automation', link: { label: 'AI solutions', href: '/artificial-intelligence-solutions' } },
      { title: 'Mobile apps', body: 'Native iOS and Android, or cross-platform in Flutter and React Native, covering the full lifecycle from idea to store.', icon: '#s-cloud', coverColor: '#FFF1E0', tag: 'iOS · Android', link: { label: 'Mobile development', href: '/mobile-app-development' } },
    ],
  },
  {
    type: 'checkList',
    anchor: 'delivery-model',
    eyebrow: 'The delivery model',
    heading: 'Offshore engineering, Melbourne accountability',
    body: 'The cost advantage of an offshore team without the coordination tax. Your project is managed by experienced consultants in Melbourne, so governance, escalation and accountability all sit in your timezone.',
    items: [
      'Local accountability with offshore scale — better velocity at lower cost',
      'A named Australian consultant responsible for the outcome, not a ticket queue',
      'Flexible engagement models: fixed-cost, milestone-based, or a dedicated team',
      'Security-minded delivery with strong governance and operational discipline',
      'Cross-industry delivery across finance, logistics, healthcare, education and manufacturing',
      'Post-deployment monitoring, updates and feature work — we do not disappear at go-live',
    ],
    sidebar: {
      title: 'Engagement options',
      rows: [
        { label: 'Fixed cost', value: 'Defined scope' },
        { label: 'Milestone-based', value: 'Pay on delivery' },
        { label: 'Dedicated team', value: 'Monthly' },
        { label: 'Advisory', value: '$150 / hour' },
        { label: 'First consultation', value: 'Free' },
      ],
    },
  },
  {
    type: 'platformChips',
    anchor: 'stack',
    eyebrow: 'Stack',
    heading: 'What we build with',
    body: 'Chosen to fit your existing team and estate, not to pad a capability list.',
    groups: [
      {
        title: 'Backend',
        chips: [
          { label: 'Python', color: '#3776AB' },
          { label: 'Java & Spring Boot', color: '#E76F00' },
          { label: 'Node.js', color: '#68A063' },
          { label: 'PHP & Laravel', color: '#777BB4' },
          { label: 'Django', color: '#092E20' },
        ],
      },
      {
        title: 'Frontend & mobile',
        chips: [
          { label: 'React & Next.js', color: '#61DAFB' },
          { label: 'Angular', color: '#DD0031' },
          { label: 'TypeScript', color: '#3178C6' },
          { label: 'Flutter', color: '#02569B' },
          { label: 'React Native & Swift', color: '#61DAFB' },
        ],
      },
      {
        title: 'Data & delivery',
        chips: [
          { label: 'SQL Server · Oracle · PostgreSQL', color: '#CC2927' },
          { label: 'REST & SOAP APIs', color: '#0E336A' },
          { label: 'Docker & Kubernetes', color: '#2496ED' },
          { label: 'CI/CD pipelines', color: '#0E7C4A' },
          { label: 'Azure · AWS · OCI', color: '#0078D4' },
        ],
      },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'recognition',
    eyebrow: 'Recognition',
    heading: 'Judged against the region, not just the local market',
    body: 'Our own product, OnsysConnect, was built by the same team that would build yours.',
    centered: true,
    altBackground: true,
    columns: 2,
    cards: [
      { title: 'BRONZE Winner — NBQSA 2025', body: 'National Best Quality Software Awards, for OnsysConnect, our digital data-sharing platform.', tag: 'National', link: { label: 'See the product', href: '/products' } },
      { title: 'Second Runner-up — APICTA 2025', body: 'Asia Pacific ICT Alliance Awards, also for OnsysConnect — judged across the region.', tag: 'Asia Pacific', link: { label: 'See the product', href: '/products' } },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Ready to turn the idea into something shipped?',
    body: 'Book a free consultation. We will tell you what it would take, what it would cost, and honestly whether building it is the right move at all.',
    cta: { label: 'Book a Free Consultation', href: '/contact' },
  },
];

/**
 * Mobile app development. The old site has no mobile page — it appears only as
 * one line on the software page and one tab on the home page. Built out here so
 * the menu item has somewhere real to land.
 */
const mobileBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'capabilities',
    eyebrow: 'What we do',
    heading: 'Maximum reach, minimum cost',
    body: 'Cross-platform where it saves money, native where it matters. We build apps people keep on their phone rather than delete in week two.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Cross-platform expertise', body: 'High-performance apps for iOS and Android, and hybrid frameworks like Flutter and React Native — one codebase reaching both stores where the app allows it.', icon: '#s-code', coverColor: '#EAF1FB', tag: 'Flutter · React Native' },
      { title: 'User-centric design', body: 'Intuitive UI and UX designed before a line of code is written, because engagement and retention are decided by the first two minutes of use.', icon: '#s-consult', coverColor: '#FFF1E0', tag: 'UI/UX first' },
      { title: 'End-to-end development', body: 'Ideation, design, build, QA, store deployment and support — the complete lifecycle from one team, not stitched across three suppliers.', icon: '#s-managed', coverColor: '#E7F5EC', tag: 'Concept to store' },
      { title: 'Agile & rapid delivery', body: 'Agile methods with DevOps pipelines behind them, so releases ship regularly and improvements do not wait for an annual cycle.', icon: '#s-etl', coverColor: '#F3F2F1', tag: 'Continuous release' },
      { title: 'Enterprise-grade quality', body: 'Performance tuning, scalability and secure coding built in — so the app handles growth and protects the sensitive data it carries.', icon: '#s-shield', coverColor: '#EAF1FB', tag: 'Secure by default' },
      { title: 'AI & cloud features', body: 'AI and machine learning, cloud-native services and advanced analytics that make the app genuinely smarter rather than merely connected.', icon: '#s-cloud', coverColor: '#FFF1E0', tag: 'Smarter apps' },
    ],
  },
  {
    type: 'steps',
    eyebrow: 'How a build runs',
    heading: 'From idea to the App Store',
    body: 'The same shape whether it is a customer-facing product or an internal field app.',
    steps: [
      { title: 'Discovery', body: 'Understand the users, the job the app has to do, and which platforms actually matter for your audience — before scoping a build.' },
      { title: 'Design', body: 'UI and UX prototyped and reviewed with you, so the interface is agreed while changing it is still cheap.' },
      { title: 'Build & QA', body: 'Iterative development with testing throughout, on Flutter, React Native or native depending on what the app needs to do.' },
      { title: 'Launch', body: 'Store submission for Apple and Google, release pipelines, and the compliance and privacy declarations both stores now require.' },
      { title: 'Support & iterate', body: 'Monitoring, OS-version updates and feature work, because a mobile app that is not maintained breaks on the next OS release.' },
    ],
  },
  {
    type: 'platformChips',
    anchor: 'stack',
    eyebrow: 'Technology',
    heading: 'What we build mobile apps with',
    body: 'Framework chosen on the requirement — cross-platform for reach and budget, native where the app needs the hardware.',
    groups: [
      {
        title: 'Frameworks',
        chips: [
          { label: 'Flutter', color: '#02569B' },
          { label: 'React Native', color: '#61DAFB' },
          { label: 'Swift (iOS native)', color: '#F05138' },
          { label: 'Android native', color: '#3DDC84' },
        ],
      },
      {
        title: 'Backend & integration',
        chips: [
          { label: 'REST APIs & microservices', color: '#0E336A' },
          { label: 'Node.js · Python · Java', color: '#68A063' },
          { label: 'Push notifications', color: '#FF8B00' },
          { label: 'Identity & SSO', color: '#0E7C4A' },
        ],
      },
      {
        title: 'Cloud & delivery',
        chips: [
          { label: 'Azure · AWS · OCI', color: '#0078D4' },
          { label: 'CI/CD release pipelines', color: '#0E7C4A' },
          { label: 'Crash & usage analytics', color: '#605E5C' },
          { label: 'App Store & Play Store', color: '#1E529D' },
        ],
      },
    ],
    sidebar: {
      title: 'Engagement options',
      items: [
        'Fixed-cost build where the scope can be defined up front.',
        'Milestone-based delivery for larger products.',
        'Dedicated team where you need ongoing capacity.',
      ],
    },
  },
  {
    type: 'ctaBand',
    heading: 'Got an app idea that keeps getting deferred?',
    body: 'Book a free consultation. We will scope it, tell you what cross-platform would save against native, and give you a realistic number.',
    cta: { label: 'Book a Free Consultation', href: '/contact' },
  },
];

/**
 * Integration services, from onsys.com.au/etl-and-integration.
 *
 * The source is five paragraphs of "why choose us" with no concrete deliverable
 * anywhere on the visible page. The specifics — SSIS, Azure Data Factory, API
 * development, import/export — are hidden in the callback form dropdown, so
 * they are promoted here into the body of the page.
 */
const integrationBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'services',
    eyebrow: 'What we do',
    heading: 'Break the silos, then keep the data flowing',
    body: 'Most organisations already hold the data they need — it is just stranded in systems that were never designed to talk to each other. Integration is the work of connecting them reliably.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'System integration', body: 'Connect diverse applications into one ecosystem — APIs, legacy systems and cloud platforms interoperating instead of exchanging spreadsheets by email.', icon: '#s-etl', coverColor: '#EAF1FB', tag: 'API · SOAP · WSO2' },
      { title: 'ETL pipelines', body: 'Extract, transform and load, done properly — data accurately extracted, reshaped into something meaningful and delivered to the destination without silent failures.', icon: '#s-managed', coverColor: '#FFF1E0', tag: 'SSIS · ADF' },
      { title: 'API development', body: 'Build the APIs your systems and partners need, with versioning, authentication and documentation so integrating with you is not an ordeal.', icon: '#s-code', coverColor: '#E7F5EC', tag: 'REST & SOAP' },
      { title: 'Data migration', body: 'One-off import and export work, system consolidations and platform moves, with reconciliation so you can prove nothing was lost.', icon: '#s-ha', coverColor: '#F3F2F1', tag: 'Reconciled' },
      { title: 'Real-time exchange', body: 'Event-driven patterns for platforms that need to stay in step continuously rather than catching up in an overnight batch.', icon: '#s-cloud', coverColor: '#EAF1FB', tag: 'Event-driven' },
      { title: 'Reporting & BI feeds', body: 'The pipelines behind the dashboard — SSRS and Power BI models fed by data that is trustworthy enough to make decisions on.', icon: '#s-consult', coverColor: '#FFF1E0', tag: 'Power BI · SSRS' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'engagements',
    eyebrow: 'Common requests',
    heading: 'What you can engage us for',
    body: 'These are the request types clients actually come to us with — from a single data export to a programme of integration work.',
    items: [
      'Data export and import between systems',
      'SQL Server SSIS package development and maintenance',
      'Develop integration packages against a defined specification',
      'API development for internal use or partner consumption',
      'Azure Data Factory pipeline design and build',
      'Legacy system integration where no modern interface exists',
      'Reporting feeds for Power BI and SSRS',
    ],
    sidebar: {
      title: 'How it is priced',
      rows: [
        { label: 'Defined scope', value: 'Fixed price' },
        { label: 'Payments', value: 'Milestone-based' },
        { label: 'Open scope', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'Scoping call', value: 'Free' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'platformChips',
    anchor: 'platforms',
    eyebrow: 'Tooling',
    heading: 'What we integrate with',
    groups: [
      {
        title: 'Integration & ETL',
        chips: [
          { label: 'SQL Server SSIS', color: '#CC2927' },
          { label: 'Azure Data Factory', color: '#0078D4' },
          { label: 'WSO2', color: '#FF8B00' },
          { label: 'REST & SOAP', color: '#0E336A' },
          { label: 'Event-driven patterns', color: '#0E7C4A' },
        ],
      },
      {
        title: 'Data sources',
        chips: [
          { label: 'SQL Server · Oracle', color: '#CC2927' },
          { label: 'PostgreSQL · EDB · MySQL', color: '#336791' },
          { label: 'MongoDB', color: '#13AA52' },
          { label: 'Flat files & SFTP', color: '#605E5C' },
          { label: 'Third-party SaaS APIs', color: '#1E529D' },
        ],
      },
      {
        title: 'Reporting',
        chips: [
          { label: 'Power BI', color: '#F2C811' },
          { label: 'SSRS', color: '#CC2927' },
          { label: 'SSAS & MDS', color: '#0E336A' },
          { label: 'Grafana', color: '#F46800' },
        ],
      },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'why-onsys',
    eyebrow: 'Why Onsys',
    heading: 'Why integration work goes wrong, and how we avoid it',
    centered: true,
    altBackground: true,
    columns: 4,
    cards: [
      { title: 'Bespoke, not templated', body: 'No two businesses have the same integration needs. We analyse your workflows and data before proposing an architecture.' },
      { title: 'Built to scale', body: 'Scalable architectures and adaptable frameworks, so the pipeline still works when the volume is ten times larger.' },
      { title: 'Secure and compliant', body: 'Data security is treated as non-negotiable at every step, from transport encryption through to access control on the destination.' },
      { title: 'Database depth', body: 'Integration lives or dies at the data tier — the layer we have run for two decades. That is not a subcontract for us.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Still moving data between systems by hand?',
    body: 'Tell us which systems need to talk and what the manual process costs you today. We will scope the integration and quote it as a fixed price.',
    cta: { label: 'Book a Free Scoping Call', href: '/contact' },
  },
];

/**
 * AI development and solutions, from onsys.com.au/artificial-intelligence-solutions.
 *
 * The strongest of the old service pages — it already names six capabilities and
 * a six-stage lifecycle. Kept close to the source, with the free proof of
 * concept promoted to the primary call to action because a 2–6 week PoC is a far
 * easier first commitment than an AI programme.
 */
const aiBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'capabilities',
    eyebrow: 'What we build',
    heading: 'Production-ready AI, not demos',
    body: 'We design, build and operate AI that runs in production: chatbots, autonomous agents, computer vision, audio intelligence and generative AI. Fast pilots, secure delivery, measurable ROI.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'AI chatbots & assistants', body: '24/7 conversational support integrated with your website, mobile apps, Teams, Slack and your own knowledge base — answering with verifiable citations rather than confident guesses.', icon: '#s-consult', coverColor: '#EAF1FB', tag: 'With citations' },
      { title: 'Generative AI', body: 'Content generation, summarisation, code review, document automation and personalised experiences, with alignment controls so output stays inside the lines.', icon: '#s-code', coverColor: '#FFF1E0', tag: 'Aligned & controlled' },
      { title: 'Autonomous agents', body: 'Task-driven agents that plan, call APIs, write data and execute workflows — with guardrails and audit trails, because an agent with write access needs both.', icon: '#s-etl', coverColor: '#E7F5EC', tag: 'Guardrailed' },
      { title: 'Computer vision', body: 'Image and video analytics, OCR, quality inspection and liveness detection, plus voice and audio analytics for verification and insight.', icon: '#s-shield', coverColor: '#F3F2F1', tag: 'Vision & audio' },
      { title: 'Proof of concepts', body: 'Two to six week PoCs that validate feasibility, quantify the impact and build stakeholder confidence before anyone commits to scaling.', icon: '#s-emergency', coverColor: '#EAF1FB', tag: '2–6 weeks' },
      { title: 'End-to-end delivery', body: 'Solution design, data pipelines, model operations, security and change enablement. We build and hand over, or run it for you.', icon: '#s-managed', coverColor: '#FFF1E0', tag: 'Build or operate' },
    ],
  },
  {
    type: 'steps',
    anchor: 'lifecycle',
    eyebrow: 'The Onsys AI lifecycle',
    heading: 'Strategy through to scale',
    body: 'Six stages, and a decision point after the second — so you find out whether it works before the budget is committed.',
    steps: [
      { title: 'Discovery & strategy', body: 'Understand the business need, assess whether your data is actually ready, and define outcomes that can be measured rather than admired.' },
      { title: 'Proof of concept', body: 'Build a working prototype in two to six weeks to validate feasibility and quantify business value before scaling.' },
      { title: 'Solution design', body: 'Architect an AI solution that fits how your business actually operates, including where a human stays in the loop.' },
      { title: 'Model development', body: 'Train, fine-tune and optimise for accuracy and efficiency, against evaluation criteria agreed up front.' },
      { title: 'Integration & deployment', body: 'Embed the solution into your applications, systems or cloud environment with the security controls your organisation requires.' },
      { title: 'Monitoring & improvement', body: 'Continuous support, optimisation and scaling — because model performance drifts as the world and your data change.' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'why-onsys',
    eyebrow: 'Why Onsys for AI',
    heading: 'We run this in our own products first',
    body: 'The chat assistant on this website is ours, built on the same retrieval and citation approach we deliver to clients. So is OnsysConnect, which took two 2025 awards.',
    items: [
      'Multi-domain expertise across chatbots, vision, audio, agents and generative AI',
      'Enterprise-grade delivery on Azure, AWS, OCI and hybrid cloud',
      'A track record with AI-powered SaaS and business transformation projects',
      'Agile, flexible engagement models: proof of concept, fixed price or dedicated team',
      'Responsible AI — transparent, secure and compliant with global standards',
      'Data pipelines and model operations handled by the team that already runs your data platform',
    ],
    sidebar: {
      title: 'Getting started',
      rows: [
        { label: 'First step', value: 'Free PoC scoping' },
        { label: 'PoC duration', value: '2–6 weeks' },
        { label: 'Then', value: 'Fixed price or team' },
        { label: 'Advisory', value: '$150 / hour' },
        { label: 'Deploy on', value: 'Azure · AWS · OCI' },
      ],
    },
  },
  {
    type: 'ctaBand',
    heading: 'Start with a proof of concept, not a programme',
    body: 'Two to six weeks to find out whether AI solves your problem and what it is worth. If the answer is no, you have spent weeks rather than a year.',
    cta: { label: 'Book a Free Proof of Concept', href: '/contact' },
  },
];

/**
 * Managed security services, from onsys.com.au/onsys-managed-security-services.
 * Sales-led rather than catalogue-led: the source lists six services with three
 * bullets each and never says what any of it prevents.
 */
const securityBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'services',
    eyebrow: 'What you get',
    heading: 'Six layers, one team watching them',
    body: 'Attackers only need one gap. This is the full stack of monitoring, hunting and response — run as a service, so you get an enterprise security capability without hiring an enterprise security team.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Managed SIEM', body: 'Real-time monitoring of security events, log aggregation and analysis across your estate, and detection that fires while the incident is still small.', icon: '#s-shield', coverColor: '#EAF1FB', tag: 'Real-time' },
      { title: '24/7 Security Operations Centre', body: 'Skilled analysts watching around the clock, triaging and escalating incidents and correlating them against live threat intelligence — including at 3am on a public holiday.', icon: '#s-emergency', coverColor: '#FFF1E0', tag: 'Always staffed' },
      { title: 'Threat hunting', body: 'Proactive hunting for what automated tooling missed, with in-depth analysis to uncover risks already inside the perimeter and continuous threat intelligence updates.', icon: '#s-consult', coverColor: '#E7F5EC', tag: 'Proactive' },
      { title: 'Managed EDR', body: 'AI-driven endpoint protection with rapid incident response, behavioural analytics for anomaly detection, and one-click rollback from ransomware.', icon: '#s-managed', coverColor: '#F3F2F1', tag: 'SentinelOne', link: { label: 'How EDR works', href: '/managed-endpoint-detection-and-response' } },
      { title: 'Vulnerability management', body: 'Regular assessments, patch management and risk prioritisation — so you fix the handful that matter this week rather than drowning in a 400-page scan report.', icon: '#s-ha', coverColor: '#EAF1FB', tag: 'Prioritised' },
      { title: 'Cloud security', body: 'Securing AWS, Azure and Google Cloud environments — identity and access management, data encryption and the compliance evidence your auditors ask for.', icon: '#s-cloud', coverColor: '#FFF1E0', tag: 'Multi-cloud' },
    ],
  },
  {
    type: 'platformChips',
    anchor: 'domains',
    eyebrow: 'Coverage',
    heading: 'Security is twelve domains, not one product',
    body: 'Buying a firewall and an anti-virus licence covers two of these. Here is the whole map, and which of our four security services owns each part.',
    groups: [
      {
        title: 'Detect & respond — this page',
        chips: [
          { label: 'Security Operations Centre', color: '#0E336A' },
          { label: 'Managed SIEM', color: '#1E529D' },
          { label: 'Threat hunting', color: '#2C8AEB' },
          { label: 'Incident response', color: '#C74634' },
          { label: 'Security dashboards', color: '#0E7C4A' },
          { label: 'Vulnerability management', color: '#605E5C' },
        ],
      },
      {
        title: 'Protect the estate',
        chips: [
          { label: 'Endpoint security', color: '#FF8B00' },
          { label: 'Network security', color: '#1BA0D7' },
          { label: 'Cloud security', color: '#0078D4' },
          { label: 'Data security', color: '#0E7C4A' },
          { label: 'Application security', color: '#8A5A44' },
          { label: 'Information security', color: '#0E336A' },
        ],
      },
      {
        title: 'Govern & assure',
        chips: [
          { label: 'Governance, risk & compliance', color: '#0E336A' },
          { label: 'Incident management', color: '#C74634' },
          { label: 'Problem management', color: '#605E5C' },
          { label: 'Disaster recovery & continuity', color: '#0E7C4A' },
        ],
      },
    ],
    sidebar: {
      title: 'The four services',
      items: [
        'Managed Security Services — detection and response, 24/7 (this page).',
        'Managed EDR — endpoint prevention, containment and rollback.',
        'Data & Application Security — protecting the data and the software.',
        'GRC & Compliance — proving the controls to an auditor.',
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'the-practice',
    eyebrow: 'Where to start',
    heading: 'Four services, one security practice',
    body: 'Most clients begin with one and add the others as the programme matures. They are designed to be bought separately and to work together.',
    centered: true,
    altBackground: false,
    columns: 4,
    cards: [
      { title: '1. Managed Security Services', body: 'Start here if you have no visibility. A 24/7 SOC, SIEM and threat hunting tell you what is actually happening on your network.', tag: 'Detect & respond' },
      { title: '2. Managed EDR', body: 'Start here if endpoints are your exposure — hybrid work, laptops off-network, ransomware risk. Prevention with rollback.', tag: 'Protect endpoints', link: { label: 'Managed EDR', href: '/managed-endpoint-detection-and-response' } },
      { title: '3. Data & Application Security', body: 'Start here if you hold regulated data or build your own software. Find it, classify it, control access and secure the code.', tag: 'Protect data & apps', link: { label: 'Data & app security', href: '/data-and-application-security' } },
      { title: '4. GRC & Compliance', body: 'Start here if an audit, a tender or a customer questionnaire is forcing the issue. Map controls, close gaps, produce evidence.', tag: 'Govern & assure', link: { label: 'GRC & compliance', href: '/grc-and-compliance' } },
    ],
  },
  {
    type: 'checkList',
    anchor: 'why-managed',
    eyebrow: 'The honest case',
    heading: 'Why buy this rather than build it',
    body: 'A 24/7 in-house SOC means hiring at least five analysts to cover the roster, plus the SIEM licensing, plus the threat intelligence feeds. For most Australian mid-market businesses the numbers never work.',
    items: [
      'Round-the-clock cover without a five-person roster on your payroll',
      'Analysts who see attacks across many clients, not just yours',
      'SIEM, EDR and threat intelligence tooling included rather than separately licensed',
      'Escalation to a human in minutes, not a ticket queue',
      'Compliance evidence and reporting produced as a by-product of the service',
      'One supplier accountable for detection and for the response that follows',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'SOC coverage', value: '24 / 7 / 365' },
        { label: 'Endpoint platform', value: 'SentinelOne' },
        { label: 'Clouds covered', value: 'AWS · Azure · GCP' },
        { label: 'Incident response', value: 'Included' },
        { label: 'Consultation', value: 'Free' },
      ],
    },
  },
  {
    type: 'steps',
    eyebrow: 'Getting protected',
    heading: 'From first call to monitored',
    body: 'No twelve-week mobilisation. Most clients are being watched inside a fortnight.',
    steps: [
      { title: 'Security posture review', body: 'A senior consultant reviews what you run, what is already protected and where the genuine exposure sits — free, and with no obligation.' },
      { title: 'Scope and quote', body: 'You get a fixed monthly price against your endpoint count, cloud footprint and the coverage level you actually need.' },
      { title: 'Deploy and tune', body: 'Agents rolled out, log sources connected, detection rules tuned to your environment so alerts mean something from week one.' },
      { title: 'Monitored and reported', body: 'The SOC takes over, you get regular reporting, and incidents are escalated with a recommended action rather than a raw alert.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Would you know if you were breached right now?',
    body: 'Most organisations find out from a customer, a bank or an attacker. Book a free security posture review and find out where you actually stand.',
    cta: { label: 'Book a Free Security Review', href: '/contact' },
  },
];

/**
 * Managed EDR, from onsys.com.au/managed-endpoint-detection-and-response.
 *
 * The source page's strongest sales asset is its EDR-versus-anti-virus
 * comparison, so that is rendered as a real table rather than prose. The live
 * page spells the platform "SentionalOne"; corrected to SentinelOne here.
 */
const edrBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'capabilities',
    eyebrow: 'What it does',
    heading: 'Stop the attack, then undo it',
    body: 'SentinelOne-based endpoint detection and response: behavioural AI that spots what signatures miss, automated containment that acts in seconds, and rollback that returns a ransomed machine to its pre-attack state.',
    centered: true,
    altBackground: true,
    columns: 2,
    cards: [
      { title: 'Respond through automation', body: 'Automated threat containment with kill, quarantine and remediation actions — plus rollback of endpoints and compromised files to their healthy pre-attack state after ransomware (Windows).', icon: '#s-emergency', coverColor: '#FFF1E0', tag: 'Ransomware rollback' },
      { title: 'Accelerate investigation', body: 'Investigate with threat intelligence from SentinelOne and leading third-party feeds, and visualise the full chain of events in an attack to understand context, root cause and lateral movement fast.', icon: '#s-consult', coverColor: '#EAF1FB', tag: 'Full attack chain' },
      { title: 'Prevent attacks', body: 'Protection against the latest threats without waiting for a scheduled scan or a malware definition update, plus policy-driven control over USB and device connections per user group.', icon: '#s-shield', coverColor: '#E7F5EC', tag: 'No scan window' },
      { title: 'Multiple AI engines', body: 'Behavioural AI catches malicious activity such as memory exploitation; static AI detects signature-less, file-based malware. Machine learning keeps the response evolving with the threat.', icon: '#s-code', coverColor: '#F3F2F1', tag: 'Behavioural + static' },
    ],
  },
  {
    type: 'richText',
    heading: 'Why anti-virus will not protect you',
    html: `
<p>Traditional anti-virus was designed for a world of known malware and scheduled scans. Attackers stopped operating that way years ago. Here is the difference, line by line.</p>
<div class="table-scroll">
<table>
<thead><tr><th>Managed EDR</th><th>Traditional anti-virus</th></tr></thead>
<tbody>
<tr><td>Roll devices back to their pre-infection state, giving you freedom from ransomware.</td><td>Cannot roll back to a pre-infection state, which increases your ransomware risk.</td></tr>
<tr><td>Uses artificial intelligence to detect and prevent current and emerging threats, with continual platform updates.</td><td>Uses signatures to identify threats, so capability lags behind the latest attacker techniques.</td></tr>
<tr><td>Automated system remediation for fast incident response.</td><td>Manual investigation of endpoint health, then manual remediation of misconfigurations and unwanted changes.</td></tr>
<tr><td>Monitors processes before, during and after execution, so new threats cannot slip through.</td><td>Blind during execution, which leaves an entry point for a capable attacker.</td></tr>
<tr><td>Monitors your systems in real time.</td><td>Relies on daily or weekly scans, increasing the window of exposure.</td></tr>
<tr><td>Keeps devices fast through continual lightweight monitoring.</td><td>Long scans that slow the machine down while they run.</td></tr>
</tbody>
</table>
</div>
<p><strong>Hybrid work widened the attack surface.</strong> It improves flexibility and work-life balance, but every home network and personal device is now part of your risk profile. Protecting your people, your customers and your reputation means monitoring endpoints wherever they are — not only the ones inside the office.</p>
`,
  },
  {
    type: 'checkList',
    anchor: 'included',
    eyebrow: 'Managed, not just licensed',
    heading: 'You are buying the outcome, not the console',
    body: 'Plenty of resellers will sell you an EDR licence and leave you to run it. An unmonitored console is not a security control.',
    items: [
      'Deployment and policy tuning to your environment, not a default template',
      'Alerts triaged by our analysts before they ever reach you',
      'Automated containment configured and tested, so response does not wait for a human',
      'Rollback rehearsed before you need it, not discovered during an incident',
      'Monitored 24/7 by the same SOC that runs our managed security service',
      'Regular reporting on what was blocked, what was investigated and what it means',
    ],
    sidebar: {
      title: 'At a glance',
      rows: [
        { label: 'Platform', value: 'SentinelOne' },
        { label: 'Monitoring', value: '24 / 7 SOC' },
        { label: 'Rollback', value: 'Windows endpoints' },
        { label: 'Deployment', value: 'Typically under 2 weeks' },
        { label: 'Demo', value: 'Free, no obligation' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'the-practice',
    eyebrow: 'Part of a wider practice',
    heading: 'Endpoints are one domain of twelve',
    body: 'EDR secures the device. These are the services that secure everything around it.',
    centered: true,
    altBackground: false,
    columns: 3,
    cards: [
      { title: 'Managed Security Services', body: 'The 24/7 SOC, managed SIEM and threat hunting that watch the whole estate — including the alerts your EDR raises.', tag: 'Detect & respond', link: { label: 'See the SOC service', href: '/managed-security-services' } },
      { title: 'Data & Application Security', body: 'Find and classify sensitive data, control who can reach it, and secure the software that touches it.', tag: 'Protect data & apps', link: { label: 'Data & app security', href: '/data-and-application-security' } },
      { title: 'GRC & Compliance', body: 'Map controls to ISO 27001, Essential Eight or SOC 2, close audit findings and produce the evidence.', tag: 'Govern & assure', link: { label: 'GRC & compliance', href: '/grc-and-compliance' } },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'See it roll back a ransomware attack',
    body: 'The demo takes twenty minutes. We encrypt a test machine, then put it back. Tell us what endpoints you run and we will show you on hardware like yours.',
    cta: { label: 'Request a Demo', href: '/contact' },
  },
];

/**
 * Data & application security — the "protect" layer of the security practice.
 * Covers the Data Security, Application Security and Information Security
 * domains, and leads with the artefacts each engagement produces because a
 * register you can hand an auditor is more persuasive than an adjective.
 */
const dataAppSecBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'data-security',
    eyebrow: 'Data security',
    heading: 'You cannot protect what nobody has mapped',
    body: 'Most breaches are embarrassing rather than sophisticated: sensitive data sitting somewhere nobody knew about, with permissions nobody reviewed. This is the work that closes that gap.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Sensitive data mapping', body: 'Find where regulated and sensitive data actually lives — including the copies in test environments, exports and mailboxes that no architecture diagram shows.', icon: '#s-etl', coverColor: '#EAF1FB', tag: 'Discovery first' },
      { title: 'Data classification', body: 'A classification scheme your staff can actually apply, backed by a classification register, so protection is proportionate instead of uniform and ignored.', icon: '#s-consult', coverColor: '#FFF1E0', tag: 'Register included' },
      { title: 'Data loss prevention', body: 'DLP policy design and tuning, with an incident log that records what was blocked and why — the evidence auditors ask for and most organisations cannot produce.', icon: '#s-shield', coverColor: '#E7F5EC', tag: 'DLP incident log' },
      { title: 'Encryption & key management', body: 'Encryption at rest and in transit, with a key management process that survives staff turnover rather than living in one person head.', icon: '#s-managed', coverColor: '#F3F2F1', tag: 'Keys under control' },
      { title: 'Access rights review', body: 'An access rights and permissions matrix showing who can reach what, so the quarterly review becomes a task rather than a project.', icon: '#s-ha', coverColor: '#EAF1FB', tag: 'Permissions matrix' },
      { title: 'Retention & disposal', body: 'Document retention and secure disposal schedules, because data you no longer need is pure liability the day you are breached.', icon: '#s-emergency', coverColor: '#FFF1E0', tag: 'Reduce the blast radius' },
    ],
  },
  {
    type: 'cardGrid',
    anchor: 'application-security',
    eyebrow: 'Application security',
    heading: 'Secure the software before it ships',
    body: 'Fixing a vulnerability in design costs a conversation. Fixing it in production costs a weekend, a disclosure and sometimes a customer. We move the work left.',
    centered: true,
    altBackground: false,
    columns: 3,
    cards: [
      { title: 'Static code analysis', body: 'SAST wired into your pipeline with the findings triaged, so developers get the handful that matter rather than a wall of noise they learn to skip.', icon: '#s-code', coverColor: '#EAF1FB', tag: 'In the pipeline' },
      { title: 'Secure coding standards', body: 'A secure coding checklist your team will actually use, aligned to the languages and frameworks you build in rather than a generic list.', icon: '#s-consult', coverColor: '#FFF1E0', tag: 'Practical, not theoretical' },
      { title: 'Application risk matrix', body: 'Rank your application estate by exposure and business impact, so remediation effort lands where a breach would hurt most.', icon: '#s-ha', coverColor: '#E7F5EC', tag: 'Prioritised' },
      { title: 'Patch & update tracking', body: 'A patch and update tracker across applications and dependencies — the boring control that prevents most of the incidents we get called to.', icon: '#s-managed', coverColor: '#F3F2F1', tag: 'Tracked, not assumed' },
      { title: 'Misconfiguration review', body: 'Security misconfiguration assessment across app servers, frameworks and cloud services, where the default setting is very often the vulnerability.', icon: '#s-cloud', coverColor: '#EAF1FB', tag: 'Defaults are dangerous' },
      { title: 'Mobile app testing', body: 'Secure mobile testing for iOS and Android builds, covering storage, transport, authentication and the third-party SDKs nobody audited.', icon: '#s-shield', coverColor: '#FFF1E0', tag: 'iOS & Android', link: { label: 'Mobile development', href: '/mobile-app-development' } },
    ],
  },
  {
    type: 'checkList',
    anchor: 'deliverables',
    eyebrow: 'What you actually receive',
    heading: 'Documents, not just advice',
    body: 'Every engagement leaves you with artefacts your team can operate and your auditor can read. These are the deliverables, not a summary of them.',
    items: [
      'Sensitive data map and data classification register',
      'Access rights and permissions matrix',
      'DLP incident log and tuned policy set',
      'Encryption key management process',
      'Document retention and secure disposal schedule',
      'Application risk matrix and secure coding checklist',
      'Static code analysis findings log with triage and owners',
      'Patch and update tracker covering apps and dependencies',
    ],
    sidebar: {
      title: 'How to engage us',
      rows: [
        { label: 'Assessment', value: 'Fixed price' },
        { label: 'Advisory', value: '$150 / hour' },
        { label: 'Minimum', value: '4 hours' },
        { label: 'Ongoing', value: 'In a managed plan' },
        { label: 'First call', value: 'Free' },
        { label: 'Prices shown', value: 'GST exclusive' },
      ],
    },
  },
  {
    type: 'ctaBand',
    heading: 'Do you know where your sensitive data is right now?',
    body: 'Most organisations find out during an incident. A data discovery and classification assessment answers it in weeks, for a fixed price.',
    cta: { label: 'Book a Data Security Assessment', href: '/contact' },
  },
];

/**
 * GRC & compliance — the "govern and assure" layer. Covers the GRC,
 * Information Security, Incident Management, Problem Management and business
 * continuity/DR domains, framed around the artefacts an auditor asks for.
 */
const grcBlocks: Block[] = [
  {
    type: 'cardGrid',
    anchor: 'capabilities',
    eyebrow: 'Governance, risk & compliance',
    heading: 'Turn the audit finding into a closed item',
    body: 'Security controls you cannot evidence do not count. We build the governance layer that proves the controls exist, work, and are being reviewed — without burying your team in paperwork.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      { title: 'Control framework mapping', body: 'Map your existing controls to the framework you are being measured against, and get a control mapping matrix that shows coverage and the genuine gaps.', icon: '#s-consult', coverColor: '#EAF1FB', tag: 'Gap analysis' },
      { title: 'Audit findings remediation', body: 'Take the findings you already have and close them — owners, evidence and dates against each one, so next audit starts from a clean base.', icon: '#s-managed', coverColor: '#FFF1E0', tag: 'Close the loop' },
      { title: 'Policy suite', body: 'Acceptable use, password, BYOD and information security policies written for your business and readable by your staff, not lifted from a template pack.', icon: '#s-shield', coverColor: '#E7F5EC', tag: 'Written to be read' },
      { title: 'Incident management', body: 'An incident management policy, reporting and tracking sheet, and a response process that works at 2am — because that is when it gets used.', icon: '#s-emergency', coverColor: '#F3F2F1', tag: 'Tested process' },
      { title: 'Problem management', body: 'Known-error records and a problem management process, so recurring incidents get a root cause and a fix instead of being closed again each month.', icon: '#s-etl', coverColor: '#EAF1FB', tag: 'Stop the repeats' },
      { title: 'Business continuity & DR', body: 'DR plan, asset register, communications plan and closure reporting — a continuity capability that has been walked through rather than filed.', icon: '#s-ha', coverColor: '#FFF1E0', tag: 'Rehearsed', link: { label: 'Database DR', href: '/database-upgrades-migrations-dr' } },
    ],
  },
  {
    type: 'platformChips',
    anchor: 'frameworks',
    eyebrow: 'Frameworks',
    heading: 'What we map your controls against',
    body: 'We map and prepare — the certification itself is issued by an accredited auditor, not by us. Knowing that distinction up front saves an awkward conversation later.',
    groups: [
      {
        title: 'Australian obligations',
        chips: [
          { label: 'ACSC Essential Eight', color: '#0E336A' },
          { label: 'Privacy Act & APPs', color: '#1E529D' },
          { label: 'Notifiable Data Breaches', color: '#C74634' },
          { label: 'APRA CPS 234', color: '#0E7C4A' },
        ],
      },
      {
        title: 'International standards',
        chips: [
          { label: 'ISO/IEC 27001', color: '#0078D4' },
          { label: 'NIST Cybersecurity Framework', color: '#605E5C' },
          { label: 'SOC 2', color: '#FF8B00' },
          { label: 'PCI DSS', color: '#1BA0D7' },
        ],
      },
      {
        title: 'Operational frameworks',
        chips: [
          { label: 'ITIL service management', color: '#0E7C4A' },
          { label: 'CIS Controls', color: '#8A5A44' },
          { label: 'Risk registers & treatment plans', color: '#0E336A' },
        ],
      },
    ],
    sidebar: {
      title: 'Be clear on scope',
      items: [
        'We assess, map, remediate and prepare you for audit.',
        'Certification is issued by an accredited external auditor.',
        'We will tell you honestly how far off you are before you commit.',
      ],
    },
  },
  {
    type: 'steps',
    eyebrow: 'How an engagement runs',
    heading: 'Four stages to audit-ready',
    steps: [
      { title: 'Assess', body: 'Review the controls you have, the framework you are measured against and the evidence you can currently produce. You get a gap list, not a lecture.' },
      { title: 'Map & prioritise', body: 'A control mapping matrix showing coverage, gaps and the risk each gap carries — so remediation money goes to the findings that matter.' },
      { title: 'Remediate', body: 'Close the gaps: policy written, controls implemented, owners named and evidence captured as the work happens rather than reconstructed later.' },
      { title: 'Evidence & review', body: 'Registers, matrices and logs handed over in a form your auditor accepts, plus a review cycle so compliance does not decay the week after sign-off.' },
    ],
  },
  {
    type: 'ctaBand',
    heading: 'Audit coming, and not sure you would pass?',
    body: 'Better to find out from us than from the auditor. Book a free scoping call and we will tell you where you stand and what closing the gap involves.',
    cta: { label: 'Book a Compliance Gap Review', href: '/contact' },
  },
];

const contactBlocks: Block[] = [
  { type: 'contactForm', heading: 'Send us a message', body: 'We typically respond within one business day.' },
];

export interface SeedPage {
  slug: string;
  title: string;
  heading: string;
  eyebrow?: string;
  lede?: string;
  seoTitle: string;
  seoDescription: string;
  navOrder?: number;
  blocks: Block[];
  faqs?: Array<{ question: string; answer: string }>;
}

export const pages: SeedPage[] = [
  {
    slug: 'home',
    title: 'Home',
    heading: 'Expert IT services you can trust.',
    eyebrow: '24/7 IT & database support · Melbourne & Colombo',
    lede: 'Smart, affordable solutions designed to accelerate your business — remote DBA cover, managed IT, cloud, AI and custom software from one accountable team.',
    // The root layout and the root page share a segment, so the "| Onsys
    // Technologies" title template does not apply here — the brand has to be
    // part of this string.
    seoTitle: 'Onsys Technologies | Managed IT, Database & Cloud Services Australia',
    seoDescription:
      'Onsys is an Australian managed IT service provider — 24/7 remote DBA support from $1,500/month, managed IT, cloud consultancy, cyber security, AI and custom software. Cut IT operating costs by up to 50%.',
    navOrder: 1,
    blocks: homeBlocks,
    /**
     * Written for answer engines: each question is phrased the way someone
     * actually searches, and each answer opens with the direct, quotable
     * response before adding detail. They are rendered as an always-in-DOM
     * accordion and emitted as FAQPage JSON-LD.
     */
    faqs: [
      { question: 'How much does remote DBA support cost in Australia?', answer: 'Onsys remote DBA plans start at $1,500 per month for up to 10 SQL Server instances and 5 TB of data. Plan B is $3,000 per month and Plan C is $7,500 per month for larger multi-platform estates. Hourly consultancy is $150 per hour with a four-hour minimum. All prices are GST exclusive.' },
      { question: 'What database platforms does Onsys support?', answer: 'Onsys supports Microsoft SQL Server, Oracle Database, PostgreSQL, EDB Postgres, MySQL, MariaDB and MongoDB, plus Azure SQL Database and Azure SQL Managed Instance. Environments are covered on-premises and on Microsoft Azure, AWS and Oracle Cloud Infrastructure.' },
      { question: 'Does Onsys provide 24/7 database and IT support?', answer: 'Yes. Every monthly plan includes 24/7/365 monitoring and remote support, delivered by a follow-the-sun team across Melbourne and Colombo. Response SLAs are two hours on Plan A and one hour on Plans B and C, guaranteed at any hour.' },
      { question: 'How quickly does Onsys respond to a database incident?', answer: 'Within one hour on the Plan B and Plan C support tiers, and within two hours on Plan A. The SLA clock runs 24 hours a day, including weekends and public holidays, and applies from the moment an alert or ticket is raised.' },
      { question: 'How much can a business save by outsourcing DBA work to Onsys?', answer: 'Onsys clients reduce DBA and IT operating costs by up to 50% compared with hiring in-house. You pay a fixed monthly plan instead of salary, recruitment, training and leave cover, and you get a certified team rather than a single person.' },
      { question: 'What engagement models does Onsys offer?', answer: 'Four: a fixed monthly support plan, a fixed-price project with milestone-based payments, blocked hours or time and materials, or a dedicated offshore development team. Models can be combined — many clients run a monthly plan alongside project work.' },
      { question: 'Does Onsys require a lock-in contract?', answer: 'No. Onsys does not use lock-in contracts. Monthly support plans run on a rolling basis, and hourly consultancy and fixed-price projects carry no ongoing commitment once the work is complete.' },
      { question: 'Where is Onsys Technologies based?', answer: 'Onsys Technologies is an Australian company with its head office at ${org.postalAddress}, and a delivery centre in Colombo, Sri Lanka. The two locations provide follow-the-sun coverage for Australian clients.' },
    ],
  },
  {
    slug: 'expertise',
    title: 'Expertise',
    heading: 'Deep, hands-on expertise across the platforms your business runs on',
    eyebrow: 'Platforms & capability',
    lede: 'Our experienced, certified team designs, builds and manages your database, cloud and on-premises infrastructure projects — staffed by senior specialists holding credentials across Oracle, Microsoft, Red Hat, VMware and Fortinet.',
    // No brand suffix — the root layout's title template appends it.
    seoTitle: 'Our Expertise | Database, Cloud, Software & Security',
    seoDescription:
      "Onsys Technologies' platform expertise across SQL Server, Oracle, PostgreSQL, EDB, Azure, AWS, Oracle Cloud, software development, AI and cyber security.",
    navOrder: 3,
    blocks: expertiseBlocks,
    faqs: [
      { question: 'Is Onsys tied to a particular vendor?', answer: 'No. We give vendor-neutral advice across SQL Server, Oracle, PostgreSQL, EDB, Azure, AWS and Oracle Cloud, and recommend what fits your environment rather than a single vendor stack.' },
      { question: 'Do you work with hybrid on-premises and cloud environments?', answer: 'Yes. Our managed plans and consultancy cover on-premises, cloud-hosted and hybrid estates across all supported database and infrastructure platforms.' },
    ],
  },
  {
    slug: 'managed-database-services',
    title: 'Managed Database Services',
    heading: 'Managed Database Services',
    eyebrow: 'Database · Ongoing Support',
    lede: '24/7 monitoring, incident management and ITIL-aligned support so your SQL Server, Oracle, PostgreSQL and EDB platforms stay healthy, secure and available around the clock — without hiring a full in-house team.',
    seoTitle: 'Managed Database Services | 24/7 DBA Support | Onsys Technologies',
    seoDescription:
      '24/7 managed database services — monitoring, incident response and ITIL-aligned support for SQL Server, Oracle, PostgreSQL and EDB, with a 2-hour response SLA.',
    blocks: mdsBlocks,
    faqs: [
      { question: 'What counts as an "incident" under the SLA?', answer: 'Any unplanned event that degrades or interrupts database availability or performance — outages, failed jobs, replication breaks, or critical alert thresholds being breached.' },
      { question: 'Can we change plans or scale up later?', answer: 'Yes — plans are reviewed monthly and can flex as your instance count, data volume or support needs change.' },
      { question: 'Do you support hybrid on-prem and cloud environments?', answer: 'Yes, our managed plans cover on-premises, cloud-hosted and hybrid database estates across SQL Server, Oracle, PostgreSQL and EDB.' },
      { question: 'What happens if we exceed our monthly professional hours?', answer: 'Additional work is billed at the standard ad-hoc rate ($140/hr in 30-minute increments) with your approval before any extra hours are worked.' },
    ],
  },
  {
    slug: 'about',
    title: 'About Us',
    heading: 'About Onsys Technologies',
    eyebrow: 'Melbourne-based · globally delivered',
    lede: 'A Melbourne technology company helping businesses in Australia and worldwide innovate, digitalise and save money through tailored IT solutions — combining onshore presence with an offshore expert team.',
    seoTitle: 'About Onsys Technologies | Melbourne IT & Database Company',
    seoDescription:
      `${org.name} is a ${org.address.locality}-based IT company delivering database, cloud, managed IT, cyber security and software services. Onshore and offshore specialists, 24/7 coverage, ABN ${org.abn}.`,
    navOrder: 5,
    blocks: aboutBlocks,
    faqs: [
      { question: 'Where is Onsys Technologies based?', answer: 'Onsys Technologies is a Melbourne-based Information Technology company, with its head office at ${org.postalAddress} and a delivery centre in Colombo, Sri Lanka. The two locations provide follow-the-sun coverage for Australian clients.' },
      { question: 'What is the Onsys Technologies ABN and ACN?', answer: '${org.legalName} holds ABN ${org.abn} and ACN ${org.acn}.' },
      { question: 'What services does Onsys provide?', answer: 'Database support and consultancy, managed database services, ad-hoc and 24×7 remote DBA support, emergency outage response and project delivery — plus cloud solutions, managed IT, cyber security, software development and AI services.' },
      { question: 'Does Onsys use offshore staff?', answer: 'Yes, deliberately. Our team combines onshore specialists in Australia with an offshore expert team in Colombo. That is how enterprise-grade engineering is delivered at a cost-effective price, with Australian accountability on every engagement.' },
      { question: 'What is Onsys Technologies’ mission?', answer: 'To design and deliver technology services that reduce operational costs, protect critical data, maximise availability, and enable organisations to manage, acquire and operate technology with confidence.' },
      { question: 'How do I start working with Onsys?', answer: 'Book a free 30-minute consultation with a senior consultant. There is no obligation, no lock-in contract on any engagement model, and you will get an honest assessment of whether the work is worth doing.' },
    ],
  },
  {
    slug: 'pricing-and-plans',
    title: 'Pricing & Plans',
    heading: 'Pricing and support plans',
    eyebrow: 'Remote IT consultancy & support',
    lede: 'Published pricing for remote database support, managed IT and hourly consultancy — with no lock-in contracts. Monthly plans start at $1,500 and consultancy is billed at a flat $150/hr, GST exclusive.',
    // The root layout appends "| Onsys Technologies" via a title template —
    // repeating it here would double it up in the browser tab.
    seoTitle: 'Pricing and Support Plans | Remote IT Consultancy & Support',
    seoDescription:
      'Onsys offers competitive pricing for all our services without lock-in contracts — 24/7 DBA plans from $1,500/month, managed IT for SMB from $4,500/month and remote consultancy at $150/hour.',
    navOrder: 4,
    blocks: pricingBlocks,
    faqs: [
      { question: 'Are the prices on this page GST inclusive?', answer: 'No. Every price shown is GST exclusive. GST is added to Australian invoices at the prevailing rate.' },
      { question: 'What happens if we use more than the included service hours?', answer: 'Additional professional service hours are billed at $140/hr in 30-minute increments. The work is agreed with you before it starts, so there are no surprise line items on the invoice.' },
      { question: 'Is there a minimum engagement for hourly consultancy?', answer: 'Yes — remote consultancy is booked in a four-hour minimum block at $150/hr across every discipline. Pre-booking guarantees consultant availability; ad-hoc requests are covered 24/7 subject to availability.' },
      { question: 'Are we locked into a contract?', answer: 'No. Onsys does not use lock-in contracts. Monthly plans run on a rolling basis and hourly work carries no ongoing commitment at all.' },
      { question: 'How are the Advanced and Premium SMB plans priced?', answer: 'They are scoped to your user count, number of sites and device mix, then quoted as a fixed monthly fee. Send us your headcount and we will come back with a firm number.' },
      { question: 'Can we combine a monthly plan with project work?', answer: 'Yes. Many clients run a monthly DBA plan for business-as-usual coverage and engage blocked hours or a time & materials contract separately for migrations, upgrades and other projects.' },
    ],
  },
  {
    // Keeps the WordPress URL so the existing link equity carries over.
    slug: 'on-call-dba-services',
    title: 'On-Call / Ad-hoc DBA Support',
    heading: 'On-call and ad-hoc DBA support',
    eyebrow: 'Subscription cover · pay per call',
    lede: 'Australian-based consultants on standby 24/7 for your SQL Server estate. $100 per instance per month holds the cover, support calls are $150 per hour — so a quiet month costs you almost nothing.',
    seoTitle: 'On-Call & Ad-hoc DBA Support | 24/7 SQL Server Cover from $100/instance',
    seoDescription:
      'On-call SQL Server DBA support from Onsys — $100 per instance per month for 24/7 standby cover with a 2-hour response SLA, plus $150/hr support calls. Australian-based certified DBAs, onboarding within 24 hours.',
    navOrder: 2,
    blocks: onCallBlocks,
    faqs: [
      { question: 'How much does on-call DBA support cost?', answer: 'The on-call subscription is $100 per SQL Server instance per month, with a minimum of four instances, and support calls are billed at $150 per hour. Both prices are GST exclusive. In a month with no incidents you pay the subscription only.' },
      { question: 'What is the difference between on-call DBA support and a monthly DBA plan?', answer: 'On-call is reactive cover: you run the databases and call a certified DBA when something breaks. A monthly 24/7 DBA plan is proactive management — continuous monitoring, health-check reporting and included service hours — starting at $1,500 per month. Many clients start on-call and move up as their estate grows.' },
      { question: 'How quickly will someone respond to an on-call incident?', answer: 'Within two hours, guaranteed, at any hour of the day or night including weekends and public holidays. You get a dedicated phone support line and service desk access, and an incident report with root cause once the issue is resolved.' },
      { question: 'Is there a minimum number of instances?', answer: 'Yes. The on-call subscription requires a minimum of four SQL Server instances. If you run fewer than four, hourly consultancy at $150 per hour with a four-hour minimum is usually the better fit.' },
      { question: 'How long does it take to set up on-call support?', answer: 'Onboarding completes within 24 hours. After a short scoping call to confirm instance count, versions and platform, we establish secure remote access, agree escalation paths and issue your dedicated support number — then cover goes live.' },
      { question: 'Which SQL Server versions and platforms are covered?', answer: 'SQL Server 2022, 2019, 2017, 2016 and 2014 or below, plus Azure SQL Database, Azure SQL Managed Instance and SQL Server on Azure VM. Hosting can be on-premises, VMware, Hyper-V, AWS, Azure, Oracle Cloud or physical hosts, on Windows Server or Linux.' },
      { question: 'Does on-call support cover databases other than SQL Server?', answer: 'The on-call subscription covers SQL Server estates. Oracle, PostgreSQL, EDB, MySQL and MongoDB are covered by the monthly 24/7 DBA plans, or by hourly remote consultancy at $150 per hour across every platform.' },
      { question: 'Can we book after-hours or weekend work in advance?', answer: 'Yes. As well as reactive incidents, on-call subscribers can schedule after-hours and weekend work such as patching, migrations and cutovers. Scheduled work is billed at the same $150 per hour against actual time worked.' },
    ],
  },
  {
    slug: 'emergency-database-support',
    title: 'Emergency Database Support',
    heading: 'Emergency database support',
    eyebrow: 'Outage response · answered 24/7',
    lede: `Production down, data at risk, or a restore that will not complete? Call ${org.phone} and speak to an Australian-based senior DBA — any hour, any day, with or without an existing agreement.`,
    seoTitle: 'Emergency Database Support Australia | 24/7 Outage Response',
    seoDescription:
      `Emergency database support from Onsys — 24/7 outage response for SQL Server, Oracle, PostgreSQL, MySQL and MongoDB. Australian-based certified DBAs, $150/hour, no existing contract required. Call ${org.phone}.`,
    navOrder: 3,
    blocks: emergencyBlocks,
    faqs: [
      { question: 'What counts as a database emergency?', answer: 'Anything where production is down, degraded or at risk of data loss: an instance that will not start, corruption or a failed restore, deleted or encrypted data, a failed upgrade, a failover that did not work, or severe blocking that has taken the application offline.' },
      { question: 'How much does emergency database support cost?', answer: 'Emergency work is billed at the published remote consultancy rate of $150 per hour with a four-hour minimum, GST exclusive. Clients on a monthly DBA plan draw on their included service hours first, then $140 per hour. We tell you the likely cost before work starts.' },
      { question: 'Do you guarantee a response time for emergency calls?', answer: 'A guaranteed response time applies if you already hold an agreement: one hour on DBA Plans B and C, two hours on Plan A, and two hours on an on-call subscription. Without a plan there is no contracted SLA — we connect you to the next available senior consultant and start as soon as access is in place.' },
      { question: 'Can you help if we are not an existing client?', answer: 'Yes. You do not need a contract to call. We take the details, establish secure remote access and begin work at $150 per hour with a four-hour minimum. Most clients set up an on-call subscription afterwards so the next incident carries a guaranteed response time.' },
      { question: 'Which database platforms do you support in an outage?', answer: 'SQL Server 2008 to 2022, Oracle 10g to 23ai, PostgreSQL, EDB, MySQL, MariaDB, MongoDB, Azure SQL Database and Azure SQL Managed Instance — running on-premises, on VMware or Hyper-V, or in Azure, AWS and Oracle Cloud.' },
      { question: 'Can you recover a corrupted or accidentally deleted database?', answer: 'Often, but it depends entirely on the failure mode and what backups exist. A senior DBA assesses recoverability early in the call and tells you honestly what can and cannot be retrieved, rather than billing hours against an outcome that is not achievable.' },
      { question: 'What information do you need when we call?', answer: 'The instance or server name, the exact error message, when the problem started, and what changed beforehand — a patch, a deployment, a restart or a storage event. Someone who can approve remote access should be available, as that is usually the first blocker.' },
      { question: 'What happens after the incident is resolved?', answer: 'You receive a written incident report covering the root cause, every change we made during recovery, and the specific remediation needed to stop it recurring. If you want that remediation delivered, it can run as a fixed-price project or against blocked hours.' },
    ],
  },
  {
    // Keeps the WordPress URL so the existing link equity carries over.
    slug: 'database-consultancy',
    title: 'Database Consultancy',
    heading: 'Database consultancy',
    eyebrow: 'Project & advisory services',
    lede: 'Need an experienced database consultant for your next project? Onsys designs, migrates and modernises database environments — optimising licence usage, exploiting virtualisation and cutting total cost of ownership along the way.',
    seoTitle: 'Database Consultancy Australia | SQL Server, Oracle & PostgreSQL Consultants',
    seoDescription:
      'Database consultancy from Onsys — architecture, migrations to Azure, AWS and OCI, high availability and DR, upgrades, BI and licence optimisation. Certified SQL Server, Oracle, PostgreSQL and EDB consultants at $150/hour or fixed price.',
    navOrder: 7,
    blocks: consultancyBlocks,
    faqs: [
      { question: 'How much does database consultancy cost?', answer: 'Advisory and consultancy work is $150 per hour with a four-hour minimum engagement, GST exclusive. Defined-scope work such as a migration, upgrade or HA build is quoted as a fixed price with milestone-based payments, so the budget is fixed before the work starts.' },
      { question: 'What database platforms do your consultants cover?', answer: 'Microsoft SQL Server, Oracle Database, PostgreSQL, EDB Postgres, MySQL, MariaDB and MongoDB. Our specialists have particular depth improving performance in EDB, SQL Server and Oracle environments, on-premises and across Azure, AWS and Oracle Cloud.' },
      { question: 'What kind of projects do you take on?', answer: 'New database infrastructure and architecture, database and platform migrations, cloud migrations to Azure, AWS or OCI, high availability and DR builds, upgrades and patching, ETL and integration work, SSRS and BI reporting, performance tuning and licence optimisation.' },
      { question: 'Can consultancy reduce our licensing costs?', answer: 'Frequently. A licence usage review combined with a virtualisation and consolidation strategy often reduces licence counts enough to pay for the engagement outright. Reducing total cost of ownership is treated as a deliverable of the work, not a side effect.' },
      { question: 'Do you offer fixed-price database projects?', answer: 'Yes. Where the scope can be defined, we quote a single fixed price with milestone-based payments and agreed timelines, covering design through to production cutover. This removes cost-overrun risk from migrations, upgrades and cluster builds.' },
      { question: 'Do you provide on-site consultants or is everything remote?', answer: 'Most work is delivered remotely, which is faster to start and cheaper for you. On-site DBA support is available where the work genuinely requires someone in the room — data centre migrations, hardware-dependent tasks or restricted environments.' },
      { question: 'What is the difference between consultancy and your DBA support plans?', answer: 'Consultancy is project and advisory work with a defined start and end — design it, migrate it, tune it, hand it over. DBA support plans are ongoing operational cover: 24/7 monitoring, incident response and a guaranteed response SLA from $1,500 per month.' },
      { question: 'How do we start a consultancy engagement?', answer: 'Book a scoping call with a senior consultant. The first conversation is free and covers what you are trying to achieve, your constraints and whether the work is worth doing. You then get options, costs and risks in writing before committing to anything.' },
    ],
  },
  {
    slug: 'products',
    title: 'Products',
    heading: 'Software products from Onsys',
    eyebrow: 'Platforms & partner products',
    lede: 'Secure data sharing, national-scale digital identity and gold-standard Oracle disaster recovery — built or backed by the same engineers who run our clients’ production systems.',
    // No brand suffix — the root layout's title template appends it.
    seoTitle: 'Products | Data Sharing, Digital ID & Oracle DR Software',
    seoDescription:
      'Onsys software products — OnsysConnect secure data sharing platform, Onsys IDMS open-source biometric digital identity, and Dbvisit StandbyMP disaster recovery for Oracle Standard Edition. Request a free demo.',
    navOrder: 2,
    blocks: productsBlocks,
    faqs: [
      { question: 'What software products does Onsys offer?', answer: 'Three: OnsysConnect, a secure multi-tenant data sharing platform; Onsys IDMS, an open-source biometric digital ID management system for national-scale programmes; and Dbvisit StandbyMP, disaster recovery for Oracle Standard Edition, SQL Server and PostgreSQL, which Onsys partners on.' },
      { question: 'What is the OnsysConnect data sharing platform?', answer: 'A secure, multi-tenant platform that sits between source systems and consuming applications, letting trusted organisations exchange sensitive data in real time. Data owners classify what each partner can see, approvals run through configurable workflows, and every API call is metered, encrypted and audited.' },
      { question: 'Is Onsys IDMS really open source?', answer: 'Yes. Onsys IDMS is an open-source biometric-enabled digital identity platform, built on standard components including Keycloak for SSO and OAuth2/OIDC. That means the implementation can be audited and you are not locked into a proprietary black box.' },
      { question: 'What is Dbvisit StandbyMP used for?', answer: 'Disaster recovery for Oracle Standard Edition, SE1 and SE2, plus Microsoft SQL Server and PostgreSQL. It maintains a continuously updated standby database, giving you enterprise-grade DR without Enterprise Edition licensing costs, on-premises or in the cloud.' },
      { question: 'Have these products won any awards?', answer: 'OnsysConnect won BRONZE at the National Best Quality Software Awards (NBQSA) 2025 and was Second Runner-up at APICTA 2025, the regional ICT awards covering the Asia Pacific.' },
      { question: 'Can we get a demo before committing?', answer: 'Yes. Demos are free and carry no obligation. Tell us what you are trying to solve and we will walk you through the relevant product, including architecture, deployment options and pricing patterns.' },
      { question: 'Can Onsys deploy and support the product for us?', answer: 'Yes. The engineers who build the platforms sit in the same organisation as the DBAs who run our managed services, so deployment, integration and ongoing 24/7 support all come from one team rather than a vendor-and-integrator chain.' },
      { question: 'Where can these products be deployed?', answer: 'On Microsoft Azure, AWS, Oracle Cloud Infrastructure or on-premises. All three are built on modular, containerised components with documented REST APIs, so they fit existing environments without bespoke connectors.' },
    ],
  },
  {
    // Merges two WordPress pages (/database-patching-and-upgrade and
    // /high-availability-solutions). Both 301 here, so the equity consolidates
    // on one URL rather than splitting across two thin ones.
    slug: 'database-upgrades-migrations-dr',
    title: 'Upgrades, Migrations & DR',
    heading: 'Database upgrades, migrations and disaster recovery',
    eyebrow: 'Project delivery · ITIL change management',
    lede: 'Get off unsupported versions, move platforms without a bad weekend, and put disaster recovery in place that has actually been failover-tested. Fixed price where the scope is defined.',
    seoTitle: 'Database Upgrades, Migrations & Disaster Recovery | SQL Server & Oracle',
    seoDescription:
      'Database upgrade, migration and DR projects from Onsys — SQL Server 2000–2019 upgrade paths, Oracle 12c/18c/19c, Oracle to EDB, cloud migration to Azure, AWS and OCI, AlwaysOn, RAC and Data Guard. Fixed-price with milestone payments.',
    navOrder: 8,
    blocks: upgradeDrBlocks,
    faqs: [
      { question: 'How much does a database upgrade or migration cost?', answer: 'Where the scope can be defined, the project is quoted as a single fixed price with milestone-based payments, so there is no cost-overrun risk. Open-scope or advisory work is $150 per hour with a four-hour minimum. Both are GST exclusive and the scoping call is free.' },
      { question: 'Which SQL Server upgrade paths do you support?', answer: 'SQL Server 2000, 2005, 2008, 2012 and 2014 up to 2016, 2017 or 2019, plus service pack and cumulative update installation and hotfix application on existing instances. Compatibility and dependency analysis is done before any change is scheduled.' },
      { question: 'Can you upgrade Oracle and related components?', answer: 'Yes — upgrades to Oracle 12c, 18c and 19c, critical patch application, PSU/CPU rollouts, plus GoldenGate, MySQL, Oracle Enterprise Manager and WebLogic upgrades.' },
      { question: 'What high availability solutions do you implement?', answer: 'SQL Server AlwaysOn availability groups, failover clustering, database mirroring, replication and log shipping; Oracle Data Guard and Real Application Clusters; MySQL clustering; and EDB Postgres Failover Manager. Each is failover-tested before handover.' },
      { question: 'How do you minimise downtime during a migration?', answer: 'Dependency analysis before planning, a proof of concept where the risk warrants it, a rehearsed cutover with a tested rollback plan, and execution inside an agreed change window under ITIL change management. Where a window is tight, the team works around the clock to hold the date.' },
      { question: 'Can you migrate our databases to the cloud?', answer: 'Yes. Established paths include SQL Server to Azure SQL Database and Azure SQL Managed Instance, on-premises to AWS, Azure or Oracle Cloud, Oracle cross-platform moves, and Oracle to EDB Postgres for licence cost reduction.' },
      { question: 'Who does the work?', answer: 'At least two certified database specialists are assigned to every project, so delivery never depends on one person. Each stage is peer reviewed by a second senior engineer before it reaches your environment.' },
      { question: 'What do we get at the end of the project?', answer: 'Comprehensive design, build and operational documentation, a closed ITIL change record for your auditors, and evidence from failover and application testing. On time-and-materials engagements you also get weekly project reporting throughout.' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    heading: 'Privacy Policy',
    eyebrow: 'Legal',
    lede: 'How Onsys Technologies collects, holds, uses and discloses personal information — and how we comply with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.',
    seoTitle: 'Privacy Policy',
    seoDescription:
      'Onsys Technologies privacy policy — what we collect, how we use it, who we disclose it to including overseas recipients, cookies and analytics, your access and correction rights, and how to make a complaint.',
    navOrder: 20,
    blocks: privacyBlocks,
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    heading: 'Terms of Use',
    eyebrow: 'Legal',
    lede: 'The terms governing your access to and use of onsys.com.au. These terms cover the website only — services are supplied under a separate signed agreement.',
    seoTitle: 'Terms of Use',
    seoDescription:
      'Terms of Use for onsys.com.au — permitted use, prohibited conduct, intellectual property, the chat assistant, disclaimers and liability, and governing law.',
    navOrder: 21,
    blocks: termsBlocks,
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    heading: 'Disclaimer',
    eyebrow: 'Legal',
    lede: 'The content on this website is general information only. This page explains the limits of what you should rely on it for — particularly the technical guides and commands we publish.',
    seoTitle: 'Disclaimer',
    seoDescription:
      'Onsys Technologies website disclaimer — general information only, technical content and code samples, AI-generated chat responses, limitation of liability, external links, copyright and trademarks.',
    navOrder: 22,
    blocks: disclaimerBlocks,
  },
  {
    // Keeps the WordPress URL so the existing link equity carries over.
    slug: 'managed-it-services',
    title: 'Managed IT Services',
    heading: 'Managed IT services',
    eyebrow: 'Your outsourced IT department',
    lede: 'A seamless, secure and efficient IT platform is critical to your business. We run all of it — network, servers, endpoints, backup, Microsoft 365 and a 24/7 service desk — for a fixed monthly fee from $4,500.',
    seoTitle: 'Managed IT Services Australia | Outsourced IT Support from $4,500/month',
    seoDescription:
      'Managed IT services from Onsys — network and server management, endpoint security, backup and recovery, Microsoft 365, IT consultancy and a 24/7 helpdesk. SMB plans from $4,500/month covering up to 30, 100 or 200 users.',
    navOrder: 9,
    blocks: managedItBlocks,
    faqs: [
      { question: 'How much do managed IT services cost?', answer: 'The Basic SMB plan is $4,500 per month for up to 30 users, GST exclusive. Advanced (up to 100 users) and Premium (up to 200 users) are scoped to your user count, site count and device mix, then quoted as a fixed monthly fee.' },
      { question: 'What is included in a managed IT plan?', answer: 'End-user support for Windows and macOS with a monthly ticket allowance, network and server management, endpoint security, patch management, Microsoft 365 administration, backup infrastructure, monitoring and alerting, and access to our ITSM service desk.' },
      { question: 'Do you provide 24/7 IT support?', answer: 'The Premium plan includes 24×7 support with priority response. Basic and Advanced provide Australian business-hours support, with 24×7 reactive monitoring and email alerting on Advanced and above so problems are caught outside hours even when staff are not working.' },
      { question: 'How many support tickets are included?', answer: '25 per month on Basic, 75 on Advanced and 120 on Premium. Capping tickets is what makes the monthly fee predictable for both sides — if you regularly exceed the allowance, that usually signals the next tier up is a better fit.' },
      { question: 'Which cloud platforms do you manage?', answer: 'On-premises, Microsoft Azure, AWS and Oracle Cloud infrastructure, plus VMware, NAS and SAN storage. Microsoft 365 administration covers Exchange Online, Teams, OneDrive, SharePoint Online and Entra ID depending on tier.' },
      { question: 'Do you test our backups?', answer: 'Backup infrastructure support is included on every tier, and the Premium plan adds one annual restoration test covering up to three servers or VMs. An untested backup is an assumption, not a recovery plan.' },
      { question: 'What tools do you use?', answer: 'SummitAI for IT service management with end-user access, Cacti and Zabbix for network monitoring, and Power BI dashboards with quarterly business reviews on the Premium tier.' },
      { question: 'Can managed IT be combined with database support?', answer: 'Yes, and most clients do. Managed IT covers the infrastructure and end users; our DBA plans cover the database estate. One supplier, one escalation path, and no argument about whose problem an outage is.' },
    ],
  },
  {
    slug: 'cloud-consultancy',
    title: 'Cloud Consultancy & Support',
    heading: 'Cloud consultancy and support',
    eyebrow: 'Strategy · architecture · FinOps · support',
    lede: 'Decide well, build it right, then run it economically. Vendor-neutral advice across Azure, AWS and Oracle Cloud from consultants certified on all three — at $150 per hour or under a managed plan.',
    seoTitle: 'Cloud Consultancy & Support | Azure, AWS & Oracle Cloud Consultants',
    seoDescription:
      'Cloud consultancy from Onsys — cloud strategy and roadmap, cost modelling and FinOps, landing zone and identity design, DevOps automation and 24/7 ongoing support across Microsoft Azure, AWS and Oracle Cloud at $150/hour.',
    navOrder: 10,
    blocks: cloudConsultancyBlocks,
    faqs: [
      { question: 'How much does cloud consultancy cost?', answer: 'Advisory and support is $150 per hour with a four-hour minimum, GST exclusive. Defined-scope work such as a readiness assessment or landing zone build is quoted as a fixed price with milestone payments, and ongoing management is available under a monthly plan.' },
      { question: 'Which cloud platform should we choose?', answer: 'That depends on your workloads, your existing licensing position and your team’s skills — not on which platform we prefer. Our consultants hold certifications across Microsoft Azure, AWS and Oracle Cloud, so the recommendation follows the evidence rather than a partner incentive.' },
      { question: 'What is a cloud readiness assessment?', answer: 'A short fixed-price engagement that discovers and analyses your workloads, models the cost to migrate and run, identifies risks and dependencies, designs the landing zone and identity platform, and prioritises workloads into migration waves. You get a written assessment with no obligation to proceed.' },
      { question: 'Can you reduce our existing cloud bill?', answer: 'Yes — that is what our FinOps practice does. Cost comparison and optimisation covers rightsizing, reserved capacity, storage tiering and removing orphaned resources. On Oracle estates, migrating to EDB Postgres can also remove significant licence cost.' },
      { question: 'Do you provide ongoing support after go-live?', answer: 'Yes. Cloud infrastructure and cloud application support are available at $150 per hour, covering monitoring, troubleshooting, patching and optimisation, or as part of a monthly managed IT plan. Pre-booking guarantees consultant availability.' },
      { question: 'What is a landing zone and why does it matter?', answer: 'A landing zone is the secured, governed foundation — networking, identity, policy and guardrails — that workloads land on. Getting it wrong is expensive to correct later, because everything deployed afterwards inherits its assumptions about security and scale.' },
      { question: 'Do you work with our existing internal team?', answer: 'Yes. Most engagements are collaborative — we design and deliver alongside your people and hand over documentation, so the knowledge stays in your business rather than leaving with us.' },
      { question: 'How do we get started?', answer: 'Book a free consultation with a cloud architect. If your workload genuinely should stay where it is, we will say so — an honest no costs us one call and saves you a migration.' },
    ],
  },
  {
    slug: 'cloud-migrations',
    title: 'Cloud Migrations',
    heading: 'Cloud migrations',
    eyebrow: 'Azure · AWS · Oracle Cloud',
    lede: 'Move workloads to the cloud without the bad weekend. Dependencies mapped, waves prioritised, cutover rehearsed with a tested rollback — delivered on a fixed price with milestone payments.',
    seoTitle: 'Cloud Migration Services | Azure, AWS & Oracle Cloud Migrations',
    seoDescription:
      'Cloud migration services from Onsys — SQL Server to Azure SQL and Managed Instance, Oracle to EDB, on-premises to Azure, AWS or OCI, and JD Edwards to Oracle Cloud. Dependency analysis, rehearsed cutover and tested rollback, fixed price.',
    navOrder: 11,
    blocks: cloudMigrationBlocks,
    faqs: [
      { question: 'How much does a cloud migration cost?', answer: 'Where the scope is defined, the migration is quoted as a single fixed price with milestone-based payments, so there is no cost-overrun risk. Open-scope work is $150 per hour with a four-hour minimum. Both are GST exclusive and the scoping call is free.' },
      { question: 'How much downtime will a migration cause?', answer: 'Less than most teams expect, because the cutover window is the last step rather than the whole project. Replication or log shipping keeps the target in sync beforehand, the cutover is rehearsed, and a tested rollback path is agreed before the window opens.' },
      { question: 'Which migration paths do you run?', answer: 'SQL Server to Azure SQL Database and Azure SQL Managed Instance, Oracle to EDB Postgres, Oracle cross-platform moves, on-premises to Azure, AWS or Oracle Cloud, JD Edwards to OCI, and MySQL or PostgreSQL onto managed cloud services.' },
      { question: 'Can migrating reduce our licensing costs?', answer: 'Often substantially. Moving Oracle workloads to EDB Postgres removes Oracle licence cost while keeping enterprise capability, and right-sizing during a migration typically finds over-provisioned infrastructure that has been paid for out of habit.' },
      { question: 'What happens if something goes wrong during cutover?', answer: 'You roll back. A tested rollback path is part of the plan for every wave, agreed before the change window opens — not improvised on the night. That is also why we migrate in prioritised waves rather than as one high-risk event.' },
      { question: 'Do you migrate applications as well as databases?', answer: 'Yes — infrastructure, applications and data. Migrations most often fail at the data tier, which is the layer we have run for two decades, so that part is our home ground rather than something we subcontract.' },
      { question: 'What do we get after the migration?', answer: 'Comprehensive design, build and operational documentation, evidence from failover and application testing, a closed change record, and post-migration monitoring and support while the environment settles. A FinOps review follows so the first bill holds no surprises.' },
      { question: 'Where should we start?', answer: 'A cloud readiness assessment. It gives you the workload inventory, the cost model and the risk list for a fixed price, before you commit to migrating anything.' },
    ],
  },
  {
    // Keeps the WordPress URL so the existing link equity carries over.
    slug: 'system-administration',
    title: 'System Administration',
    heading: 'System administration services',
    eyebrow: 'Windows · Linux · Microsoft 365 · identity',
    lede: 'The work nobody notices until it stops happening. We administer your Windows and Linux servers, Microsoft 365 tenancy and identity platform so your team can focus on the business.',
    seoTitle: 'System Administration Services | Windows, Linux & Microsoft 365',
    seoDescription:
      'System administration from Onsys — Windows Server and Active Directory, Linux configuration and hardening, Microsoft 365 administration and licence management, RBAC and account provisioning. $150/hour or within a managed IT plan.',
    navOrder: 12,
    blocks: sysAdminBlocks,
    faqs: [
      { question: 'How much does system administration cost?', answer: 'Hourly system administration is $150 per hour with a four-hour minimum, GST exclusive. It is also included within managed IT plans from $4,500 per month, and defined work such as a domain migration can be quoted as a fixed price.' },
      { question: 'Which operating systems do you support?', answer: 'Windows Server 2012 through 2022, Linux including RHEL, CentOS, Ubuntu and Oracle Linux, and UNIX platforms including Solaris, AIX and HP-UX. We also administer Active Directory, Entra ID, LDAP, Keycloak, Nginx, HAProxy, Apache and Tomcat.' },
      { question: 'Do you handle Microsoft 365 administration?', answer: 'Yes — Exchange Online administration, Teams, SharePoint and OneDrive configuration, and licence management. Licence reviews frequently pay for themselves by identifying seats and tiers that are paid for but not used.' },
      { question: 'Can you take over patching?', answer: 'Yes. We run the monthly patch cycle across servers and workstations on a defined schedule, so systems stay current rather than falling a year behind and becoming an audit finding.' },
      { question: 'Do you help with staff onboarding and offboarding?', answer: 'Yes. Account provisioning covers the full lifecycle from onboarding to offboarding, with access revoked the same day someone leaves — the step most often missed and the one that matters most.' },
      { question: 'Can you harden a server before it goes live?', answer: 'Yes. Security hardening covers Linux and Windows builds facing the internet, implementing role-based access control, tightening password policy, and auditing the result rather than assuming the change took effect.' },
      { question: 'Do you offer after-hours work?', answer: 'Yes. Changes needing a maintenance window can be scheduled after hours or at weekends, billed at the same $150 per hour against actual time worked.' },
      { question: 'Can system administration be bundled with other services?', answer: 'Yes, and it usually is. Most clients fold it into a managed IT plan alongside network, endpoint and Microsoft 365 support, so there is one supplier and one escalation path rather than several.' },
    ],
  },
  {
    slug: 'network-and-firewalls',
    title: 'Network & Firewalls',
    heading: 'Network and firewall services',
    eyebrow: 'Design · defend · monitor',
    lede: 'Network architecture built around your business, firewalls that are actively managed rather than installed and forgotten, and round-the-clock monitoring so stability does not depend on someone noticing.',
    seoTitle: 'Network & Firewall Services | Cisco, Fortinet & Palo Alto Support',
    seoDescription:
      'Network and firewall services from Onsys — network design and optimisation, firewall configuration and management, intrusion detection, VPN and remote access, and 24/7 monitoring across Cisco, Fortinet, Palo Alto, Juniper, Check Point and Sophos.',
    navOrder: 13,
    blocks: networkBlocks,
    faqs: [
      { question: 'How much do network and firewall services cost?', answer: 'Network and firewall support is $150 per hour with a four-hour minimum, GST exclusive. Ongoing management is included in managed IT plans from $4,500 per month, and defined projects such as a firewall replacement are quoted as a fixed price.' },
      { question: 'Which firewall vendors do you support?', answer: 'Fortinet, Palo Alto Networks, Check Point, Sophos, Cisco ASA and Firepower, and F5. On the network side we work across Cisco, Juniper, NETGEAR and Dell, plus cloud-native controls including Azure Firewall, AWS security groups and OCI network security.' },
      { question: 'Can you review our existing firewall rules?', answer: 'Yes, and it is one of the most common first engagements. Rule sets accumulate over years, and most organisations are running rules nobody can explain. A review identifies what is redundant, what is too permissive and what should be documented.' },
      { question: 'Do you provide 24/7 network monitoring?', answer: 'Yes. Continuous monitoring with alerting is available as a standalone engagement or as part of a managed IT plan, so problems are detected rather than reported by users the next morning.' },
      { question: 'Can you help during a security incident?', answer: `Yes. Troubleshooting and responding to network security incidents is one of the request types clients engage us for. For anything affecting production right now, call ${org.phone} rather than emailing.` },
      { question: 'Do you set up VPN and remote access?', answer: 'Yes — site-to-site VPN connecting remote offices and remote-access VPN for staff, designed so the concentrator does not itself become a single point of failure for the business.' },
      { question: 'Are you tied to one vendor?', answer: 'No. We are multi-vendor by design and not reselling a single stack, so the recommendation follows your requirements, your existing estate and your budget rather than a partner target.' },
      { question: 'Can you help us plan an upcoming project?', answer: 'Yes. Requesting an estimate for upcoming project work is a standard engagement — we will scope it, tell you what it involves and quote it as a fixed price where the scope can be defined.' },
    ],
  },
  {
    slug: 'virtualization-and-storage',
    title: 'Virtualization & Storage',
    heading: 'Virtualisation and storage',
    eyebrow: 'VMware · Hyper-V · KVM · SAN & NAS',
    lede: 'Consolidate infrastructure and cut the complexity and cost of hardware-based environments — with the storage underneath administered as deliberately as the hypervisor above it.',
    seoTitle: 'Virtualisation & Storage Services | VMware, Hyper-V, KVM, SAN & NAS',
    seoDescription:
      'Virtualisation and storage services from Onsys — VMware, Hyper-V and Oracle Linux KVM architecture, migration, upgrades, health checks and support, plus storage administration across NetApp, Dell EMC, HPE, Hitachi, IBM, Veeam and Commvault.',
    navOrder: 14,
    blocks: virtStorageBlocks,
    faqs: [
      { question: 'How much do virtualisation and storage services cost?', answer: 'Hourly work is $150 per hour with a four-hour minimum, GST exclusive. Defined projects such as a hypervisor migration or array replacement are quoted as a fixed price with milestone payments, and ongoing support is included in managed IT plans from $4,500 per month.' },
      { question: 'Which hypervisors do you work with?', answer: 'VMware vSphere and ESXi, Microsoft Hyper-V, Oracle Linux KVM and Citrix. We are not tied to one — the recommendation follows your workloads and your licensing position rather than a reseller relationship.' },
      { question: 'Can you migrate us off an old VMware version?', answer: 'Yes. Migration planning and execution from older VMware versions or another hypervisor onto current releases is a standard engagement, planned to minimise downtime with a tested rollback path.' },
      { question: 'What storage platforms do you administer?', answer: 'NetApp, Dell EMC, HPE, Hitachi, IBM and Oracle Database Appliance, across Fibre Channel, iSCSI, NFS and CIFS, plus backup platforms including Veeam and Commvault.' },
      { question: 'Our VMs are slow — is that virtualisation or storage?', answer: 'Usually storage, and often latency rather than capacity. A performance analysis looks at both layers together, because tuning the hypervisor while the array is the bottleneck wastes the engagement.' },
      { question: 'Can virtualisation actually reduce our costs?', answer: 'Yes, when it is sized properly. Consolidation reduces physical hardware, power and licence counts together. A virtualisation assessment models what can be consolidated and what it would save before you commit to the work.' },
      { question: 'Do you offer health checks on an existing environment?', answer: 'Yes. Health checks audit the environment, identify configuration drift and performance bottlenecks, and include remediation — so findings are actually fixed rather than handed over as a report.' },
      { question: 'Do you handle replication between sites for DR?', answer: 'Yes. Storage replication between sites for disaster recovery is part of the storage administration engagement, and pairs with the database-level DR work on our upgrades, migrations and DR page.' },
    ],
  },
  {
    slug: 'custom-software-development',
    title: 'Custom Software Development',
    heading: 'Custom software development',
    eyebrow: 'Offshore engineering · Melbourne accountability',
    lede: 'Built fast, built secure, built to scale. Web applications, APIs, modernisation and AI-enabled features — delivered by an offshore engineering team under experienced Melbourne project management.',
    seoTitle: 'Custom Software Development Australia | Offshore Teams, Local Accountability',
    seoDescription:
      'Custom software development from Onsys — web applications, SaaS platforms, backend and APIs, application modernisation and AI-enabled features. Offshore engineering with Melbourne project management, on fixed-cost, milestone or dedicated-team engagements.',
    navOrder: 15,
    blocks: customSoftwareBlocks,
    faqs: [
      { question: 'How does offshore development work at Onsys?', answer: 'The engineering team is offshore for speed and cost efficiency, and your project is managed by experienced consultants in Melbourne. You get local accountability, governance in your timezone and a named person responsible for the outcome — not a ticket queue in another country.' },
      { question: 'What engagement models do you offer?', answer: 'Fixed-cost where the scope can be defined, milestone-based for larger builds, or a dedicated team where you need ongoing capacity. Advisory and smaller pieces of work are $150 per hour with a four-hour minimum, GST exclusive.' },
      { question: 'What kind of software do you build?', answer: 'Customer portals and SaaS platforms, internal business systems, backend services and APIs, application modernisation and legacy rebuilds, system integration, mobile apps, and AI-enabled features such as LLM assistants and document intelligence.' },
      { question: 'What technologies do you work in?', answer: 'Python, Java and Spring Boot, Node.js, PHP and Laravel, and Django on the backend; React, Next.js, Angular and TypeScript on the front end; Flutter, React Native and Swift for mobile; deployed on Azure, AWS or Oracle Cloud with CI/CD pipelines.' },
      { question: 'Do you modernise existing applications?', answer: 'Yes. Legacy rebuilds, cloud migration and performance uplift are a significant part of what we do — typically for systems that still run the business but have become risky or expensive to change.' },
      { question: 'What happens after launch?', answer: 'Post-deployment monitoring, updates and feature enhancements. We do not treat go-live as the end of the engagement, because software that is not maintained becomes the legacy system somebody has to rebuild later.' },
      { question: 'Have your products won awards?', answer: 'Yes. OnsysConnect, our digital data-sharing platform, took BRONZE at the National Best Quality Software Awards (NBQSA) 2025 and was Second Runner-up at APICTA 2025 — built by the same team that would build your project.' },
      { question: 'Which industries have you delivered for?', answer: 'Finance, logistics, healthcare, education and manufacturing, among others. Cross-industry delivery matters less than understanding your specific process, which is what the discovery stage is for.' },
    ],
  },
  {
    slug: 'mobile-app-development',
    title: 'Mobile App Development',
    heading: 'Mobile app development',
    eyebrow: 'iOS · Android · Flutter · React Native',
    lede: 'High-performance apps for iOS and Android, cross-platform where it saves money and native where it matters — from ideation through design, build, QA, store launch and ongoing support.',
    seoTitle: 'Mobile App Development | iOS, Android, Flutter & React Native',
    seoDescription:
      'Mobile app development from Onsys — native iOS and Android, plus Flutter and React Native cross-platform builds. UI/UX design, agile delivery, enterprise-grade security, App Store and Play Store launch, and ongoing support.',
    navOrder: 16,
    blocks: mobileBlocks,
    faqs: [
      { question: 'Should we build cross-platform or native?', answer: 'Cross-platform with Flutter or React Native reaches both stores from one codebase and usually costs meaningfully less. Native is worth it when the app leans heavily on device hardware, needs the newest OS features first, or has demanding performance requirements. We will tell you which applies before you commit.' },
      { question: 'How much does a mobile app cost?', answer: 'It depends entirely on scope, which is why the first conversation is a free scoping call. Builds are quoted as a fixed cost where scope can be defined, milestone-based for larger products, or delivered by a dedicated team. All prices are GST exclusive.' },
      { question: 'Do you handle App Store and Play Store submission?', answer: 'Yes. Store submission is part of the launch stage, including the privacy declarations and compliance metadata both Apple and Google now require, which is where first-time submissions most often get rejected.' },
      { question: 'Do you design the app as well as build it?', answer: 'Yes. UI and UX are prototyped and reviewed with you before development starts, while changing the interface is still cheap. Engagement and retention are largely decided by the first two minutes of use.' },
      { question: 'What happens after the app launches?', answer: 'Monitoring, OS-version updates and feature work. This matters more for mobile than for web — an unmaintained app will eventually break on an OS release and be removed from the store.' },
      { question: 'Can the app integrate with our existing systems?', answer: 'Yes. Most apps we build are the front end to something else — we build the REST APIs and backend services alongside, or integrate with the systems you already run.' },
      { question: 'Can you add AI features to a mobile app?', answer: 'Yes — AI and machine learning, cloud-native services and advanced analytics, from in-app assistants to image recognition. Our AI practice delivers these alongside the mobile build rather than as a separate project.' },
      { question: 'Do you work on existing apps?', answer: 'Yes. Taking over an existing codebase for maintenance, feature work or a rebuild is common, particularly where the original developer is no longer available.' },
    ],
  },
  {
    slug: 'integration-services',
    title: 'Integration Services',
    heading: 'Integration and ETL services',
    eyebrow: 'APIs · ETL · data pipelines',
    lede: 'Your data is already there — it is just stranded in systems that were never designed to talk to each other. We build the integrations and pipelines that connect them reliably.',
    seoTitle: 'Integration & ETL Services | APIs, SSIS & Azure Data Factory',
    seoDescription:
      'Integration and ETL services from Onsys — system integration, SSIS and Azure Data Factory pipelines, API development, data migration, event-driven exchange and Power BI reporting feeds. Fixed price or $150/hour.',
    navOrder: 17,
    blocks: integrationBlocks,
    faqs: [
      { question: 'How much does integration work cost?', answer: 'Defined-scope work such as an SSIS package or an API build is quoted as a fixed price with milestone payments. Open-scope and advisory work is $150 per hour with a four-hour minimum. Both are GST exclusive and the scoping call is free.' },
      { question: 'What integration tooling do you work with?', answer: 'SQL Server SSIS, Azure Data Factory, WSO2, REST and SOAP APIs, and event-driven patterns. On the data side we work across SQL Server, Oracle, PostgreSQL, EDB, MySQL, MongoDB, flat files and third-party SaaS APIs.' },
      { question: 'Can you integrate with a legacy system that has no API?', answer: 'Usually yes. Where no modern interface exists we work with what is available — database-level integration, file drops over SFTP, or building an API layer in front of the legacy system so everything downstream sees a clean interface.' },
      { question: 'Do you build APIs for our partners to consume?', answer: 'Yes. API development covers internal and partner-facing interfaces, with versioning, authentication and documentation, so integrating with you is straightforward rather than an ordeal.' },
      { question: 'Can you help with a one-off data migration?', answer: 'Yes. Data export and import, system consolidations and platform moves are common engagements, and we reconcile the result so you can demonstrate nothing was lost in transit.' },
      { question: 'Do you build the pipelines behind Power BI dashboards?', answer: 'Yes. Reporting feeds for Power BI and SSRS are part of the service. A dashboard is only as trustworthy as the pipeline underneath it, which is where most reporting projects actually fail.' },
      { question: 'How do you keep data secure during integration?', answer: 'Encryption in transit, least-privilege access on both source and destination, and access controls carried through to the destination system. Security is treated as part of the design rather than a review at the end.' },
      { question: 'What if our requirements change later?', answer: 'Architectures are built to scale and adapt — the pipeline should still work when volume grows tenfold or a new source system arrives. That is a design decision made at the start, not a retrofit.' },
    ],
  },
  {
    // Keeps the WordPress URL — it already carries the primary keyword.
    slug: 'artificial-intelligence-solutions',
    title: 'AI Development & Solutions',
    heading: 'AI development and solutions',
    eyebrow: 'Strategy → proof of concept → scale',
    lede: 'Production-ready AI, not demos. Chatbots, autonomous agents, computer vision and generative AI — starting with a two to six week proof of concept that tells you whether it is worth scaling.',
    seoTitle: 'AI Development & Solutions | Chatbots, Agents & Generative AI',
    seoDescription:
      'AI development from Onsys — AI chatbots with verifiable citations, autonomous agents, generative AI, computer vision and audio intelligence. Two to six week proof of concept, then fixed price or dedicated team. Deployed on Azure, AWS and OCI.',
    navOrder: 18,
    blocks: aiBlocks,
    faqs: [
      { question: 'How do we start with AI without committing to a big programme?', answer: 'With a proof of concept. Two to six weeks to validate feasibility, quantify the impact and build stakeholder confidence. If the answer is that AI does not solve your problem, you have spent weeks finding out rather than a year.' },
      { question: 'What kinds of AI solutions do you build?', answer: 'AI chatbots and virtual assistants, autonomous agents that call APIs and execute workflows, generative AI for content, summarisation, code review and document automation, computer vision including OCR and liveness detection, and audio and voice analytics.' },
      { question: 'How do you stop an AI assistant from making things up?', answer: 'Retrieval against your own knowledge base with verifiable citations, so answers are grounded in your content and users can check the source. Alignment controls and guardrails constrain what the system will say and do, and agents that write data carry audit trails.' },
      { question: 'Where do AI solutions get deployed?', answer: 'Microsoft Azure, AWS, Oracle Cloud or hybrid environments, with the security controls your organisation requires. Deployment target is usually decided by where your data already lives and what your compliance obligations allow.' },
      { question: 'Is our data used to train public models?', answer: 'That is a design decision made explicitly at the start, and it is one of the first things we cover. Enterprise deployments are normally configured so your data is not used for third-party model training, and the architecture reflects that requirement.' },
      { question: 'How much does an AI engagement cost?', answer: 'A proof of concept is scoped and quoted individually based on the use case and data readiness. Beyond that, engagements run as fixed price, dedicated team, or advisory at $150 per hour with a four-hour minimum. All prices are GST exclusive.' },
      { question: 'Do you operate the solution after it is built?', answer: 'Either way. We build and hand over with documentation and model operations in place, or we run it for you — including monitoring, optimisation and retraining as the data and the business change.' },
      { question: 'Have you actually shipped AI in production?', answer: 'Yes. The chat assistant on this website is ours, built on the same retrieval and citation approach, and OnsysConnect won BRONZE at NBQSA 2025 and Second Runner-up at APICTA 2025.' },
    ],
  },
  {
    slug: 'managed-security-services',
    title: 'Managed Security Services',
    heading: 'Managed security services',
    eyebrow: 'SIEM · SOC · threat hunting · EDR',
    lede: 'An enterprise security capability without an enterprise security team. A 24/7 SOC, managed SIEM and threat hunting form the detection layer of a four-part security practice covering all twelve security domains.',
    seoTitle: 'Managed Security Services | 24/7 SOC, SIEM & Threat Hunting',
    seoDescription:
      'Managed security services from Onsys — managed SIEM, a 24/7 Security Operations Centre, proactive threat hunting, managed EDR, vulnerability management and cloud security across AWS, Azure and Google Cloud. Book a free security posture review.',
    navOrder: 19,
    blocks: securityBlocks,
    faqs: [
      { question: 'What is included in managed security services?', answer: 'Six layers: managed SIEM with real-time event monitoring and log analysis, a 24/7 Security Operations Centre, proactive threat hunting, managed endpoint detection and response, vulnerability management with patch prioritisation, and cloud security across AWS, Azure and Google Cloud.' },
      { question: 'Is the SOC really staffed 24/7?', answer: 'Yes. Skilled analysts monitor around the clock, triage and escalate incidents, and correlate them against live threat intelligence — including overnight, at weekends and on public holidays, which is when a significant share of attacks are launched precisely because most teams are not watching.' },
      { question: 'Why not build our own SOC?', answer: 'Covering a 24/7 roster properly takes at least five analysts, plus SIEM licensing and threat intelligence feeds. For most Australian mid-market organisations the economics never work, which is why the capability is bought as a service rather than built.' },
      { question: 'How much does it cost?', answer: 'Pricing is scoped to your endpoint count, cloud footprint and the coverage level you need, then quoted as a fixed monthly fee. The security posture review that precedes the quote is free and carries no obligation.' },
      { question: 'Do you handle the response, or just the alert?', answer: 'Both. Incident response is part of the service — alerts are triaged by our analysts and escalated to you with a recommended action, rather than forwarded as a raw alert for you to interpret at 2am.' },
      { question: 'Which cloud platforms do you secure?', answer: 'AWS, Microsoft Azure and Google Cloud, covering identity and access management, data encryption and the compliance evidence auditors ask for. On-premises and hybrid estates are covered alongside.' },
      { question: 'Will this help with compliance and audits?', answer: 'Yes. Reporting and compliance evidence are produced as a by-product of the monitoring, so audit season becomes an export rather than a scramble. Vulnerability management includes risk prioritisation and remediation support.' },
      { question: 'How quickly can we be protected?', answer: 'Most clients are monitored within a fortnight: posture review, fixed quote, agent rollout and detection tuning, then the SOC takes over. There is no twelve-week mobilisation.' },
    ],
  },
  {
    // Keeps the WordPress URL — it carries the full search term.
    slug: 'managed-endpoint-detection-and-response',
    title: 'Managed EDR',
    heading: 'Managed endpoint detection and response',
    eyebrow: 'SentinelOne · behavioural AI · rollback',
    lede: 'Prevent, detect and reverse cyber attacks on your endpoints. Behavioural AI catches what signatures miss, automated remediation contains the threat in seconds, and rollback returns a ransomed machine to its pre-attack state.',
    seoTitle: 'Managed EDR | SentinelOne Endpoint Detection & Response Australia',
    seoDescription:
      'Managed EDR from Onsys, built on SentinelOne — behavioural and static AI detection, automated containment and remediation, ransomware rollback, and 24/7 SOC monitoring. See why anti-virus is no longer enough. Request a free demo.',
    navOrder: 20,
    blocks: edrBlocks,
    faqs: [
      { question: 'What is EDR and how is it different from anti-virus?', answer: 'Anti-virus matches known signatures on a scan schedule. EDR monitors process behaviour continuously — before, during and after execution — using AI to catch threats that have no signature yet, contains them automatically, and can roll the endpoint back to its pre-infection state.' },
      { question: 'Which EDR platform do you use?', answer: 'SentinelOne. It combines behavioural AI for activity such as memory exploitation with static AI for signature-less file-based malware, and provides the rollback capability that makes ransomware survivable.' },
      { question: 'Can you really undo a ransomware attack?', answer: 'On Windows endpoints, yes. Rollback restores compromised files and the endpoint itself to their healthy pre-attack state. It is the single most valuable capability in the platform, and we rehearse it with you rather than leaving you to discover it during an incident.' },
      { question: 'Will it slow our machines down?', answer: 'No. Continual lightweight monitoring replaces the long scheduled scans that make traditional anti-virus painful, so device performance stays fast and users stop trying to disable it.' },
      { question: 'What does "managed" add over buying a licence?', answer: 'Deployment and tuning to your environment, alerts triaged by our analysts before they reach you, automated containment configured and tested, 24/7 SOC monitoring, and regular reporting. An unmonitored EDR console is not a security control.' },
      { question: 'Does it protect staff working from home?', answer: 'Yes, and that is much of the point. Hybrid work put every home network and personal device inside your risk profile. Protection follows the endpoint rather than the office perimeter.' },
      { question: 'Can we control USB and device access?', answer: 'Yes. Policy-driven protection lets you allow or block USB and device connections per user or group, which closes one of the most common routes for malware to enter a corporate network.' },
      { question: 'How do we evaluate it?', answer: 'Request a demo. It takes about twenty minutes — we encrypt a test machine and then roll it back. Tell us what endpoints you run and we will demonstrate on comparable hardware.' },
    ],
  },
  {
    slug: 'data-and-application-security',
    title: 'Data & Application Security',
    heading: 'Data and application security',
    eyebrow: 'Classify · control · secure the code',
    lede: 'Find the sensitive data you did not know you held, control who can reach it, and secure the software that touches it — with the registers, matrices and logs to prove it.',
    seoTitle: 'Data & Application Security | Classification, DLP & Secure Code',
    seoDescription:
      'Data and application security from Onsys — sensitive data mapping and classification, DLP, encryption key management, access rights review, static code analysis, secure coding standards, patch tracking and mobile app testing.',
    navOrder: 21,
    blocks: dataAppSecBlocks,
    faqs: [
      { question: 'Where do we start with data security?', answer: 'With discovery. Until you know where sensitive and regulated data actually lives — including copies in test environments, exports and mailboxes — every other control is guesswork. A data mapping and classification assessment is the usual first engagement and is quoted as a fixed price.' },
      { question: 'What is data classification and why does it matter?', answer: 'It is a scheme that rates data by sensitivity so protection is proportionate. Without it, organisations either protect everything equally (expensive and ignored) or nothing consistently. You get a classification register your staff can actually apply.' },
      { question: 'Can you help us implement DLP?', answer: 'Yes — policy design, deployment and the tuning that decides whether staff work with it or route around it. You also get a DLP incident log recording what was blocked and why, which is the evidence auditors ask for and most organisations cannot produce.' },
      { question: 'Do you review who has access to what?', answer: 'Yes. We produce an access rights and permissions matrix covering systems, shares and applications, so the quarterly access review becomes a routine task rather than a project nobody starts.' },
      { question: 'What does application security cover?', answer: 'Static code analysis wired into your pipeline with findings triaged, secure coding standards for the languages you actually use, an application risk matrix, patch and dependency tracking, security misconfiguration review, and mobile app testing for iOS and Android.' },
      { question: 'Will security scanning slow our developers down?', answer: 'Only if it is left untuned. Raw SAST output is mostly noise, and developers learn to skip it. We triage findings so the team sees the handful that matter, which is the difference between a control that works and one that is bypassed.' },
      { question: 'Do you test mobile applications?', answer: 'Yes — storage, transport security, authentication and the third-party SDKs that nobody audited, across iOS and Android builds. It pairs naturally with our mobile development practice if you also need the fixes implemented.' },
      { question: 'What do we get at the end?', answer: 'Documents, not a slide deck: sensitive data map, classification register, permissions matrix, DLP incident log, key management process, retention and disposal schedule, application risk matrix, secure coding checklist and a patch tracker.' },
    ],
  },
  {
    slug: 'grc-and-compliance',
    title: 'GRC & Compliance',
    heading: 'Governance, risk and compliance',
    eyebrow: 'Map · remediate · evidence',
    lede: 'Security controls you cannot evidence do not count. We map your controls to the framework you are measured against, close the gaps, and hand over the registers and matrices your auditor will accept.',
    seoTitle: 'GRC & Compliance Services | ISO 27001, Essential Eight & SOC 2 Readiness',
    seoDescription:
      'Governance, risk and compliance from Onsys — control framework mapping against ISO 27001, ACSC Essential Eight, NIST CSF, SOC 2 and APRA CPS 234, audit findings remediation, policy suites, incident and problem management, and business continuity planning.',
    navOrder: 22,
    blocks: grcBlocks,
    faqs: [
      { question: 'Can you certify us to ISO 27001?', answer: 'No, and be wary of anyone who says they can. Certification is issued by an accredited external auditor. What we do is assess your current position, map controls, close the gaps and prepare the evidence — so the audit is a formality rather than a discovery exercise.' },
      { question: 'Which frameworks do you work with?', answer: 'ACSC Essential Eight, the Privacy Act and Australian Privacy Principles, the Notifiable Data Breaches scheme and APRA CPS 234 locally; ISO/IEC 27001, the NIST Cybersecurity Framework, SOC 2, PCI DSS and CIS Controls internationally; plus ITIL for service management.' },
      { question: 'We already have audit findings. Can you just close them?', answer: 'Yes, and it is one of the most common engagements. We take the findings you have, assign owners and dates, implement the fixes and capture the evidence as the work happens — so the next audit starts from a clean base rather than the same list.' },
      { question: 'Do you write our security policies?', answer: 'Yes — acceptable use, password, BYOD and information security policies written for your business and readable by your staff. A template pack nobody reads satisfies nobody, least of all an auditor who asks how it is enforced.' },
      { question: 'What is problem management and why is it in a security page?', answer: 'Because recurring incidents are a security risk, not just an annoyance. Problem management finds root cause and produces known-error records, so the same issue stops being closed and reopened every month.' },
      { question: 'Do you cover business continuity and DR?', answer: 'Yes — DR plan, asset register, communications plan and closure reporting, walked through rather than filed. For database-level recovery specifically, that is covered in depth on our upgrades, migrations and DR page.' },
      { question: 'How long does it take to get audit-ready?', answer: 'It depends entirely on your starting point, which is why the first step is a gap review. We will tell you honestly how far off you are before you commit budget — an unrealistic timeline helps nobody once the auditor arrives.' },
      { question: 'How is this priced?', answer: 'The gap review is a fixed-price assessment. Remediation is quoted once the gaps are known, as fixed price where the scope can be defined or $150 per hour with a four-hour minimum where it cannot. All prices are GST exclusive.' },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    heading: 'Contact us',
    eyebrow: 'Get in touch',
    lede: "Tell us about your environment and a senior consultant will get back to you — or book a free 30-minute call directly if you'd rather skip the form.",
    seoTitle: 'Contact Onsys Technologies | Melbourne IT & Database Consultants',
    seoDescription:
      `Get in touch with ${org.name} — ${org.postalAddress}, ${org.phone}, ${org.email}.`,
    navOrder: 6,
    blocks: contactBlocks,
  },
];

export const SQL_ARTICLE_HTML = `
<h2 id="why">Why this happens</h2>
<p>SQL Server stores the name it was installed under in two places that can drift apart after a clone or a Windows-level rename:</p>
<ul>
  <li><strong>The Windows machine name</strong> — controlled entirely by Windows, and whatever you set it to during or after sysprep/rename.</li>
  <li><strong>SQL Server's internal server name</strong> — captured in the <code>master.sys.servers</code> table at install time and surfaced through <code>@@SERVERNAME</code>. This value does <strong>not</strong> update automatically when Windows is renamed.</li>
</ul>
<p>Once those two diverge, anything that relies on <code>@@SERVERNAME</code> — replication, some Availability Group health checks, certain SSRS and SSAS operations, and any custom code that queries the instance's own name — starts referencing a host that no longer exists.</p>

<h2 id="check">Step 1 — Confirm the mismatch</h2>
<p>Before changing anything, confirm there actually is a mismatch. Connect to the instance and run:</p>
<pre><code>SELECT @@SERVERNAME                           -- SQL Server's internal record
SELECT SERVERPROPERTY('ServerName')           -- what SQL Server currently reports
SELECT SERVERPROPERTY('MachineName')          -- the actual Windows machine name</code></pre>
<p>If <code>@@SERVERNAME</code> still shows the old hostname while <code>MachineName</code> shows the new one, you have the classic post-clone mismatch and the fix below applies.</p>

<h2 id="before">Before you change anything</h2>
<p><strong>Take a full backup first.</strong> This procedure touches system metadata in <code>master</code>. On a production instance, back up <code>master</code> (and ideally take a full instance backup) before proceeding, and run the change in a maintenance window — the fix itself requires a service restart.</p>

<h2 id="fix">Step 2 — Update the internal server name</h2>
<p>For a standalone (non-clustered) default instance, drop the stale name and register the new one using the built-in system stored procedures:</p>
<pre><code>-- Remove the old, stale server name entry
EXEC sp_dropserver 'OLD-SERVER-NAME';
GO

-- Register the current name, keeping it as a local server
EXEC sp_addserver 'NEW-SERVER-NAME', local;
GO</code></pre>

<h2 id="restart">Step 3 — Restart the SQL Server services</h2>
<p>The change doesn't take effect until the Database Engine service is restarted. Restart, in order:</p>
<ol>
  <li>SQL Server (MSSQLSERVER, or the named instance service)</li>
  <li>SQL Server Agent</li>
  <li>Any dependent services you stopped for the maintenance window (SSRS, SSAS, SSIS if co-located)</li>
</ol>

<h2 id="verify">Step 4 — Verify the change</h2>
<pre><code>SELECT @@SERVERNAME                    -- should now show the new name
SELECT SERVERPROPERTY('ServerName')    -- should match @@SERVERNAME</code></pre>

<h2 id="named">Named instances</h2>
<p>For a named instance, <code>@@SERVERNAME</code> returns <code>COMPUTERNAME\\INSTANCENAME</code>, so both the drop and add steps need the full name.</p>

<h2 id="downstream">Step 5 — Fix downstream dependencies</h2>
<ul>
  <li><strong>Replication</strong> — publications and subscriptions store the server name in their metadata and typically need to be dropped and reconfigured.</li>
  <li><strong>Reporting Services (SSRS)</strong> — re-run the Reporting Services Configuration Manager and be prepared to restore the encryption keys.</li>
  <li><strong>Analysis Services (SSAS)</strong> — update deployment targets, connection strings and scheduled processing jobs.</li>
  <li><strong>Linked servers on other instances</strong> — update any definition pointing at the old name.</li>
  <li><strong>Kerberos SPNs</strong> — register new SPNs for the new hostname and remove the stale ones.</li>
  <li><strong>Application &amp; ETL connection strings</strong>, DNS records and monitoring configuration.</li>
</ul>

<h2 id="cluster">A note on clustered instances &amp; Availability Groups</h2>
<p>This procedure applies to a <strong>standalone instance</strong>. For a Failover Cluster Instance the client-facing name is the cluster network name resource, not the Windows node name. For Always On Availability Groups clients usually connect via the listener, so a node rename has different impact — validate AG health after any change.</p>
`;

export { homeBlocks, mdsBlocks, expertiseBlocks, aboutBlocks, pricingBlocks, contactBlocks };
