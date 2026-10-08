// v2 presentation data. Every `quote` is VERBATIM from the matching live service page —
// the building-section diagram only places each service where its own copy says it works.

export const lineBySlug: Record<string, string> = {
  'soft-strip-out': '/images/lines/soft-strip-out.webp',
  'structural-alterations-demolition': '/images/lines/structural-alterations.webp',
  'diamond-drilling': '/images/lines/diamond-drilling.webp',
  'groundworks-and-drainage': '/images/lines/groundworks-drainage.webp',
  'structural-steelwork': '/images/lines/structural-steelwork.webp',
  'structural-carpentry': '/images/lines/structural-carpentry.webp',
  'composite-flooring': '/images/lines/composite-flooring.webp',
  'landscaping-and-external-works': '/images/lines/landscaping-external.webp',
  screeding: '/images/lines/screeding.webp',
};

export const zones: Record<string, { quote: string; tag: string }> = {
  'soft-strip-out': {
    tag: 'Fit-out floors',
    quote: 'Our experienced teams carry out the careful removal of non-structural elements — including fixtures, fittings, ceilings, partitions, mechanical and electrical installations — while maintaining the integrity of the existing structure.',
  },
  'structural-alterations-demolition': {
    tag: 'Existing structure',
    quote: 'From intricate strengthening works within existing buildings to full structural integrations, ANP Construction provides a comprehensive, coordinated, and quality-assured service that meets the highest industry standards.',
  },
  'diamond-drilling': {
    tag: 'Through slabs & walls',
    quote: 'Our experienced team undertakes all forms of controlled concrete cutting, including core drilling, track sawing, wire sawing, and floor sawing, across a wide range of project environments.',
  },
  'groundworks-and-drainage': {
    tag: 'Below ground',
    quote: 'At ANP Construction, we take pride in our ability to deliver a full range of groundworks and drainage solutions, from simple floor slab extensions to complex below-ground alterations.',
  },
  'structural-steelwork': {
    tag: 'Frame & roof',
    quote: 'Working in close collaboration with clients, structural engineers, and design teams, we develop both temporary and permanent steel solutions that support the safe and efficient delivery of complex construction schemes.',
  },
  'structural-carpentry': {
    tag: 'Framing & trusses',
    quote: 'At ANP Construction, we provide expert structural carpentry services for projects of all sizes, from custom decks and pergolas to commercial framing and trusses.',
  },
  'composite-flooring': {
    tag: 'Voids & shafts',
    quote: 'Our expertise covers everything from filling service voids and redundant shafts to the construction of complete composite slab floors.',
  },
  'landscaping-and-external-works': {
    tag: 'External works',
    quote: 'We undertake a wide range of external packages, including paving, kerbing, retaining structures, drainage, fencing, and soft landscaping, ensuring every element is completed with precision and attention to detail.',
  },
  screeding: {
    tag: 'Floor finishes',
    quote: 'We work closely with clients and follow-on trades to guarantee that the final floor finishes can be installed without delay, maintaining programme efficiency and high-quality standards.',
  },
};
