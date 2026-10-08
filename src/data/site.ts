// Single source of truth for ANP Construction content.
// Every string here is VERBATIM from https://www.anpconstruction.co.uk (fetched 2026-10-05)
// unless a comment says otherwise. Do not add claims, stats or copy that the client
// hasn't supplied — leave it out and ask instead.
import images from './images.json';

type Img = { src: string; sm: string; md?: string; w: number; h: number; orig: string };
const img = images as unknown as Record<string, Img & Img[]>;

export const company = {
  name: 'ANP Construction',
  legalName: 'ANP Construction Ltd',
  phone: '020 3602 5863',
  phoneHref: 'tel:+442036025863',
  // The live site shows hello@anpconstruction.co.uk in its footer, but every mailto link
  // and the Contact page use hello@anpconstructionltd.co.uk. Both domains have live mail
  // servers (Outlook / Google). We use the address the live links actually send to —
  // CONFIRM WITH CLIENT.
  email: 'hello@anpconstructionltd.co.uk',
  address: {
    line1: '35A Millmead Industrial Centre',
    line2: 'Mill Mead Road',
    locality: 'London',
    postcode: 'N17 9QU',
  },
  instagram: 'https://www.instagram.com/anpconstruction/',
  // The live LinkedIn icon links to Wix's own company page, so it is not carried over.
  url: 'https://www.anpconstruction.co.uk',
};

export const nav = [
  { label: 'About', href: '/about', children: [
    { label: 'About ANP', href: '/about' },
    { label: 'Our Team', href: '/team' },
    { label: 'Clients', href: '/clients' },
  ] },
  { label: 'What We Do', href: '/services', mega: true },
  { label: 'Additional Projects', href: '/additional-projects' },
  { label: 'Careers', href: '/careers' },
];

// ---- Home -----------------------------------------------------------------
export const home = {
  // Live H1 was "Building Dreams, Crafting Excellence". Replaced (per brief: no slogans)
  // with a factual line built from the live copy's own words ("specialist package",
  // "trade packages", "complex construction challenges").
  heading: 'Specialist trade packages for complex construction.',
  intro:
    'From concept to completion, ANP Construction delivers high-quality, reliable, and innovative construction solutions for homes, offices, and industrial projects. With a commitment to exceptional craftsmanship, attention to detail, and lasting quality, we bring every project to life with precision, professionalism, and confidence.',
  aboutHeading: 'About ANP Construction',
  about: [
    'At ANP Construction Ltd, we have built a reputation for delivering a diverse range of trade packages that consistently meet — and often exceed — our clients’ expectations. We are committed to the highest standards of safety, quality, and sustainability, and our track record demonstrates our ability to complete projects of varying complexity on programme and to exacting standards.',
    'Our success is driven by the expertise of our staff, our collaborative approach, and our ability to provide cost-effective, practical solutions to complex construction challenges. Founded on openness, integrity, and trust, we have established long-term relationships with clients and supply-chain partners, reflected in the significant proportion of repeat business we enjoy.',
  ],
  servicesHeading: 'Quality Construction. Trusted Results.',
  testimonialsHeading: 'Trusted by Our Clients',
  projectsHeading: 'Our Projects',
  accreditationsHeading: 'Company Accreditations',
};

export const cta = {
  heading: 'Ready to Discuss Your Project?',
  body: [
    'At ANP Construction Ltd, we’re ready to bring your vision to life.',
    'Whether it’s a new build, refurbishment, or specialist package, our team delivers practical, cost-effective, and high-quality solutions every time.',
  ],
  button: 'Start a Project',
};

// Verbatim from the live homepage. Names and roles only — the live site gives no
// company for any of them.
export const testimonials = [
  {
    quote:
      'ANP Construction Ltd delivered exceptional service from start to finish. Their attention to detail, communication, and commitment to safety were evident throughout the project. The team went above and beyond to meet our expectations.',
    name: 'Simon Stimson',
    role: 'Project Manager',
  },
  {
    quote:
      'Working with ANP Construction was a great experience. They’re professional, responsive, and solution-focused. Every stage of the project was handled efficiently, and the final result reflected true craftsmanship and care.',
    name: 'M.Cook',
    role: 'Director',
  },
  {
    quote:
      'We’ve partnered with ANP Construction Ltd on multiple projects, and they’ve never disappointed. Their reliability, technical expertise, and strong work ethic make them one of the best contractors we’ve worked with.',
    name: 'Nigel Robinson',
    role: 'Operations Manager',
  },
];

// Badges shown under "Company Accreditations" on the live homepage.
export const accreditations = [
  { name: 'Constructionline Gold Member', src: '/images/accreditations/constructionline-gold.jpg', w: 389, h: 194 },
  { name: 'CHAS Accreditation — Elite', src: '/images/accreditations/chas-elite.jpg', w: 135, h: 135 },
  { name: 'NICEIC Approved Contractor', src: '/images/accreditations/niceic.jpg', w: 150, h: 100 },
];

// ---- Services ---------------------------------------------------------------
// Order and card names as on the live homepage / Services page. `title` is the live
// page heading; `metaTitle` is the live <title> prefix.
export type Service = {
  slug: string;
  name: string;
  title: string;
  metaTitle: string;
  oldPath: string;
  body: string[];
  images: Img[];
  // Index into `images` used as the hero / card photo. Presentation only — changing
  // it changes no copy. v3: steelwork 2→13 (red frame), drilling 2→6 (marked core
  // holes), carpentry 1→0, so no service hero repeats the About or Careers hero.
  cover: number;
};

export const services: Service[] = [
  {
    slug: 'soft-strip-out',
    name: 'Soft Strip Out',
    title: 'Soft Strip Out',
    metaTitle: 'Soft Strip Out',
    oldPath: '/soft-strip-out',
    body: [
      'At ANP Construction, we provide comprehensive soft strip-out services as part of refurbishment, fit-out, and redevelopment projects. Our experienced teams carry out the careful removal of non-structural elements — including fixtures, fittings, ceilings, partitions, mechanical and electrical installations — while maintaining the integrity of the existing structure.',
      'Working across commercial, residential, and industrial environments, we adopt a methodical and safety-led approach, ensuring all waste materials are segregated and managed responsibly in line with environmental best practices. Whether operating within live buildings or fully vacated premises, our soft strip operations are delivered efficiently, quietly, and with minimal disruption, preparing each site for the next phase of construction with precision and professionalism.',
      // The live page ends with a third paragraph about groundworks and drainage —
      // a copy/paste error. It has been moved to the Groundworks page.
    ],
    images: img['soft-strip-out'],
    cover: 0,
  },
  {
    slug: 'structural-alterations-demolition',
    name: 'Structural Alterations/Demolition',
    title: 'Structural Alterations / Demolition',
    metaTitle: 'Structural Alterations/Demolition',
    oldPath: '/structural-alterations-demolition',
    // The live page repeats the Soft Strip Out copy word for word, so it is not used.
    // This single line is assembled only from statements the live Structural Steelwork
    // page makes about ANP's structural alteration projects. CLIENT TO SUPPLY PROPER COPY.
    body: [
      'Structural steelwork is an integral part of our structural alteration projects — from intricate strengthening works within existing buildings to full structural integrations, delivered in close collaboration with clients, structural engineers, and design teams.',
    ],
    images: img['structural-alterations'],
    cover: 8,
  },
  {
    slug: 'diamond-drilling',
    name: 'Diamond Drilling',
    title: 'Diamond Drilling',
    metaTitle: 'Diamond Drilling',
    oldPath: '/diamond-drilling',
    body: [
      'At ANP Construction, we operate a dedicated in-house diamond drilling division, equipped with modern, high-performance tools and machinery. Our experienced team undertakes all forms of controlled concrete cutting, including core drilling, track sawing, wire sawing, and floor sawing, across a wide range of project environments.',
      'We pride ourselves on delivering precise, clean, and efficient results with minimal disruption to surrounding structures or site operations. Whether planned works or fast-response requirements, our team provides a reliable and professional service to support even the most demanding project programmes.',
    ],
    images: img['diamond-drilling'],
    cover: 6,
  },
  {
    slug: 'groundworks-and-drainage',
    name: 'Groundworks and Drainage',
    title: 'Groundworks and Drainage',
    metaTitle: 'Groundworks and Drainage',
    oldPath: '/groundworks-and-drainage',
    body: [
      // Moved here from the end of the live Soft Strip Out page (see note there).
      'At ANP Construction, we take pride in our ability to deliver a full range of groundworks and drainage solutions, from simple floor slab extensions to complex below-ground alterations. Our experienced team combines technical expertise with a proactive and safety-focused approach, ensuring that every stage of excavation, foundation, and drainage work is carried out to the highest standard.',
      'Groundworks often involve dealing with unforeseen conditions and site-specific challenges. Through our emphasis on health and safety, transparency, and clear communication of construction methodologies, we provide clients with confidence and reliability.',
      'Whether supporting new-build projects or adapting existing infrastructure, ANP Construction offers a competent and collaborative service tailored to each site’s unique requirements.',
    ],
    images: img['groundworks-drainage'],
    cover: 4,
  },
  {
    slug: 'structural-steelwork',
    name: 'Structural & Steelworks',
    title: 'Structural Steelwork',
    metaTitle: 'Structural Steelwork',
    oldPath: '/structural-steelwork',
    body: [
      'At ANP Construction, we specialise in the design, supply, and installation of structural steelwork as an integral part of our structural alteration projects. Working in close collaboration with clients, structural engineers, and design teams, we develop both temporary and permanent steel solutions that support the safe and efficient delivery of complex construction schemes.',
      'Through our established relationships with trusted fabricators, suppliers, and engineers, we ensure every installation is bespoke to the project’s requirements, regardless of scale or complexity. From intricate strengthening works within existing buildings to full structural integrations, ANP Construction provides a comprehensive, coordinated, and quality-assured service that meets the highest industry standards.',
    ],
    images: img['structural-steelwork'],
    cover: 13,
  },
  {
    slug: 'structural-carpentry',
    name: 'Structural Carpentry',
    title: 'Structural Carpentry',
    // Live <title> for this page is "Structural Steelwork" (Wix "copy of" page) — fixed.
    metaTitle: 'Structural Carpentry',
    oldPath: '/copy-of-structural-steelwork',
    body: [
      'At ANP Construction, we provide expert structural carpentry services for projects of all sizes, from custom decks and pergolas to commercial framing and trusses. Our skilled team combines technical knowledge, precision craftsmanship, and practical experience to deliver solutions that are both functional and aesthetically pleasing.',
      'Whether you are a homeowner, contractor, or business client, ANP Construction ensures every project is completed to the highest standard, on time, and within budget. Our collaborative approach and attention to detail mean that each structural carpentry solution is tailored to the client’s unique requirements, guaranteeing long-lasting results and client satisfaction.',
    ],
    images: img['structural-carpentry'],
    cover: 0,
  },
  {
    slug: 'composite-flooring',
    name: 'Composite Flooring',
    title: 'Composite Flooring',
    metaTitle: 'Composite Flooring',
    oldPath: '/composite-flooring',
    body: [
      'At ANP Construction, we are highly experienced in the supply and installation of composite flooring systems, providing reliable solutions for a wide range of structural and infill requirements. Our expertise covers everything from filling service voids and redundant shafts to the construction of complete composite slab floors.',
      'Working in collaboration with designers and structural engineers, we ensure all composite floor installations are delivered safely, efficiently, and in full compliance with design specifications. Our skilled teams combine technical precision with practical on-site knowledge, enabling ANP Construction to offer a robust and high-quality service suited to projects of any scale or complexity.',
    ],
    images: img['composite-flooring'],
    cover: 3,
  },
  {
    slug: 'landscaping-and-external-works',
    name: 'Landscaping & External Works',
    // Live heading reads "Landscaping External Works" (missing "and") — fixed.
    title: 'Landscaping and External Works',
    metaTitle: 'Landscaping and External Works',
    oldPath: '/landscaping-and-external-works',
    body: [
      'At ANP Construction, our dedicated groundworks team brings a proven track record in delivering high-quality landscaping and external works. We undertake a wide range of external packages, including paving, kerbing, retaining structures, drainage, fencing, and soft landscaping, ensuring every element is completed with precision and attention to detail.',
      'Working closely with clients, designers, and main contractors, we focus on achieving durable, functional, and visually impressive finishes that enhance the overall presentation and performance of each project. Our commitment to quality craftsmanship and safety ensures all external works are delivered on time, to specification, and to the highest standard.',
    ],
    images: img['landscaping-external'],
    cover: 1,
  },
  {
    slug: 'screeding',
    name: 'Screeding',
    title: 'Screeding',
    metaTitle: 'Screeding',
    oldPath: '/screeding',
    body: [
      'At ANP Construction, we bring extensive experience in the delivery of structural and floor screeding works across a wide range of construction environments. Our team has the technical knowledge and on-site expertise to manage all aspects of the process — from logistics and planning to material selection and installation — ensuring each floor is prepared accurately and efficiently.',
      'We work closely with clients and follow-on trades to guarantee that the final floor finishes can be installed without delay, maintaining programme efficiency and high-quality standards. Whether part of a larger structural package or as a standalone service, ANP Construction provides a precise, reliable, and professional screeding solution tailored to each project’s requirements.',
    ],
    images: img['screeding'],
    cover: 6,
  },
];

// ---- Projects ---------------------------------------------------------------
// Union of the project cards on the live homepage and Careers page. `client` is the
// name printed under "Project Name" on each card; blank where the card gives none.
export type Project = { name: string; note?: string; client?: string; image?: Img; featured?: boolean };
const p = (k: string) => img['project-' + k] as Img;

export const projects: Project[] = [
  { name: '1 Eversholt St', note: 'Lendlease', client: 'Maris Interiors', image: p('eversholt'), featured: true },
  { name: 'New Cobham House', client: 'AREA', image: p('cobham'), featured: true },
  { name: 'Air Products Plc', client: 'Maris Interiors', image: p('airproducts'), featured: true },
  { name: '8 Poland St', image: p('poland'), featured: true },
  { name: 'Tait Building', image: p('tait'), featured: true },
  { name: '155 Tooley St', image: p('tooley'), featured: true },
  { name: 'University of Sunderland in London', client: 'Maris Interiors', image: p('sunderland') },
  { name: '9 Bressenden Place', note: 'HPS', client: 'Maris Interiors', image: p('bressenden') },
  { name: 'UCA Epsom', note: 'Wells Building', client: 'Maris Interiors', image: p('uca-epsom') },
  { name: '31 Dover Street', note: 'LCA', client: 'Maris Interiors', image: p('dover') },
  { name: '11 Leadenhall St', client: 'AREA', image: p('leadenhall') },
  // The live card reuses the 11 Leadenhall St photo, so no image is shown here.
  { name: 'Broadgate Business Centre', client: 'AREA' },
  { name: 'Birkbeck, University of London', client: 'Maris Interiors', image: p('birkbeck') },
  { name: '14 The Broadway', note: 'Dexters Wimbledon', client: 'Donostia Interiors', image: p('broadway') },
  { name: '3 Hogarth Rd', note: 'Dexters Earls Court', client: 'Donostia Interiors', image: p('hogarth') },
];

export const clients = ['Maris Interiors', 'AREA', 'Donostia Interiors'].map((name) => ({
  name,
  projects: projects.filter((x) => x.client === name),
}));

// ---- About ------------------------------------------------------------------
export const about = {
  heading: 'Building with Integrity, Quality, and Commitment',
  valuesHeading: 'Our Core Values',
  valuesIntro:
    'At ANP Construction Ltd, these values underpin everything we do ensuring that every project is delivered safely, efficiently, and to the highest standards of quality.',
  values: [
    { title: 'Customer Satisfaction', text: 'Placing our clients at the heart of every project.' },
    { title: 'Health, Safety', text: 'Prioritising people and the planet.' },
    { title: 'Collaboration', text: 'Working together for better outcomes.' },
    { title: 'Integrity & Honesty', text: 'Doing what’s right, every time.' },
    { title: 'Value Engineering', text: 'Delivering smarter, more efficient solutions.' },
    { title: 'Respect', text: 'For our people, our partners, and our community.' },
  ],
  storyHeading: 'Integrity & Honesty',
  story: [
    'At ANP Construction Ltd, we are a trusted construction company delivering high-quality, cost-effective, and sustainable building solutions across the UK.',
    'We specialise in a diverse range of trade packages and take pride in completing every project safely, efficiently, and to the highest standards of workmanship.',
    'Driven by a culture of integrity, teamwork, and innovation, our experienced team works closely with clients to provide practical solutions tailored to their specific needs.',
    'Over the years, we’ve built lasting relationships based on trust, transparency, and exceptional performance, earning repeat business and a reputation for excellence in the industry.',
  ],
  howHeading: 'How We Work',
  how: [
    'At ANP Construction Ltd, our ethos is simple to build with integrity, deliver with excellence, and lead with respect.',
    'Every project we undertake is guided by our commitment to safety, quality, and collaboration, ensuring that our clients receive the highest standard of service from start to finish.',
    'We believe that successful construction is more than just building structures it’s about building trust, relationships, and lasting value.',
    'Our team embraces transparency, open communication, and innovation at every stage, creating an environment where people work together towards shared success.',
    'By prioritising people, performance, and professionalism, we continue to strengthen our reputation as a reliable and responsible construction partner.',
  ],
  principles: [
    { title: 'Integrity in Every Project', text: 'We believe in honesty, transparency, and doing what’s right — every time. Integrity forms the foundation of all our client relationships and decision-making.' },
    { title: 'Commitment to Quality', text: 'Quality is at the core of everything we build. From materials to workmanship, we ensure every detail meets the highest industry standards.' },
    { title: 'Safety First', text: 'The safety of our people, partners, and the public is our top priority. We maintain strict health and safety protocols on every site to protect everyone involved.' },
    { title: 'Collaboration & Teamwork', text: 'We work closely with clients, consultants, and suppliers to create solutions that are practical, efficient, and aligned with project goals.' },
    { title: 'Continuous Improvement', text: 'We embrace new technologies, methods, and materials to improve efficiency and deliver smarter, more sustainable outcomes.' },
    { title: 'Client Satisfaction', text: 'Our success is measured by our clients’ satisfaction. We focus on clear communication, reliability, and exceeding expectations at every stage.' },
  ],
};

// ---- Team (live /out-team) ----------------------------------------------------
// Photos intentionally blank until the client supplies them — add `photo: '/images/team/…'`.
export const team: { name: string; role: string; photo?: string }[] = [
  { name: 'Alfons Pali', role: 'Managing Director' },
  { name: 'Arjon Ndrecaj', role: 'Senior Project Manager' },
  { name: 'Solomon Orepitan', role: 'Quantity Surveyor' },
  { name: 'Chimereze Onwukwe', role: 'Project Manager' },
  { name: 'Antonio Bzhetaj', role: 'Project Manager' },
  { name: 'Armando Pali', role: 'Site Manager' },
  { name: 'Tony Shehu', role: 'Plant Manager' },
  { name: 'Marjana Pali', role: 'Office Manager' },
];

// ---- Careers ------------------------------------------------------------------
export const careers = {
  heading: 'Careers at ANP Construction',
  sub: 'Build your future with a company that values skill, safety, and growth.',
  body: [
    'At ANP Construction, we are always looking for talented and motivated individuals to join our growing team. We take pride in our high staff retention rate, with many of our site management team having progressed through the ranks to become meticulous, safety-conscious leaders.',
    'We currently have opportunities across a variety of site roles, including shuttering carpenters, steelfixers, and concrete finishers. Joining ANP Construction means becoming part of a collaborative, supportive, and professional environment, where your skills are valued, and career progression is actively encouraged.',
    'If you are passionate about construction and want to develop your career in a company committed to quality, safety, and excellence, we would love to hear from you.',
  ],
  roles: ['Shuttering carpenters', 'Steelfixers', 'Concrete finishers'],
};

// ---- Contact --------------------------------------------------------------------
export const contact = {
  heading: 'Contact Us',
  // Live sub-heading "Build Your Dream Home with Us" dropped: ANP is a commercial trade
  // contractor and the brief rules out slogans.
  tender: 'If you want to reach out to us about future project enquiries then please don’t hesitate to e-mail us with your tender',
  jobs: 'Alternatively if you would like to find out about employment opportunities then please e-mail to admin',
  signoff: 'We look forward to hearing from you.',
};

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug)!;
