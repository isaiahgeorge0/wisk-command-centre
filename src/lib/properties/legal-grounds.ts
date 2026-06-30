export type PossessionGround = {
  id: string;
  number: string;
  name: string;
  type: "mandatory" | "discretionary";
  noticePeriodWeeks: number;
  explanation: string;
  legalWording: string;
  protectedPeriodMonths: number | null;
  requiresArrearsCheck: boolean;
};

export const POSSESSION_GROUNDS: PossessionGround[] = [
  {
    id: "ground_1",
    number: "1",
    name: "Occupation by landlord or family",
    type: "mandatory",
    noticePeriodWeeks: 17,
    protectedPeriodMonths: 12,
    requiresArrearsCheck: false,
    explanation:
      "This ground can be used if the landlord or a close family member needs to move into the property. The date that the tenant is asked to leave cannot be within the first 12 months of a new tenancy.",
    legalWording:
      "The current tenancy began at least 1 year before the relevant date and the landlord who is seeking possession requires the dwelling-house as the only or principal home of any of the following—\n(a) the landlord; (b) the landlord's spouse or civil partner or a person with whom the landlord lives as if they were married or in a civil partnership; (c) the landlord's— (i) parent; (ii) grandparent; (iii) sibling; (iv) child; (v) grandchild; (d) a child or grandchild of a person mentioned in paragraph (b). A relationship of the half-blood is to be treated as a relationship of the whole blood. In the case of joint landlords seeking possession, references to \"the landlord\" in this ground are to be read as references to at least one of those joint landlords. When calculating whether the current tenancy began at least 1 year before the relevant date, both— (a) the day when the current tenancy began, and (b) the relevant date, must be included in the calculation.",
  },
  {
    id: "ground_1a",
    number: "1A",
    name: "Sale of dwelling house",
    type: "mandatory",
    noticePeriodWeeks: 17,
    protectedPeriodMonths: 12,
    requiresArrearsCheck: false,
    explanation:
      "This ground can be used if the landlord intends to sell the property. The date that the tenant is asked to leave cannot be within the first 12 months of a new tenancy.",
    legalWording:
      "The following conditions are met — (a) the landlord who is seeking possession intends to sell a freehold or leasehold interest in the dwelling-house or to grant a lease of the dwelling-house for a term certain of more than 21 years which is not terminable before the end of that term by notice given by or to the landlord; (b) the assured tenancy on which the dwelling-house is let did not come into being by virtue of any provision of Schedule 1 to the Rent Act 1977 or section 4 of the Rent (Agriculture) Act 1976; (c) either — (i) the current tenancy began at least 1 year before the relevant date, or (ii) at the relevant date, notice of a compulsory acquisition in relation to the dwelling-house has been given, the landlord intends to sell their interest in the dwelling-house to the acquiring authority and the acquiring authority intends to acquire it; (d) the landlord seeking possession is not — (i) a non-profit registered provider of social housing, (ii) a body registered as a social landlord in the register maintained under section 1 of the Housing Act 1996, (iii) a body registered as a social landlord in the register kept under section 20(1) of the Housing (Scotland) Act 2010, (iv) a housing trust, within the meaning of the Housing Associations Act 1985, which is a charity, or (v) where the dwelling-house is social housing within the meaning of Part 2 of the Housing and Regeneration Act 2008, a profit-making registered provider of social housing. In paragraph (c)(ii), \"sell\" includes transfer. When calculating whether the current tenancy began at least 1 year before the relevant date, both — (a) the day when the current tenancy began, and (b) the relevant date, must be included in the calculation.",
  },
  {
    id: "ground_8",
    number: "8",
    name: "Rent arrears",
    type: "mandatory",
    noticePeriodWeeks: 4,
    protectedPeriodMonths: null,
    requiresArrearsCheck: true,
    explanation:
      "This ground can be used if the tenant owes at least three months' rent if they pay rent monthly, or at least 13 weeks' rent if the rent is paid weekly or fortnightly. The arrears must be at or above these amounts both when the notice is served and at the date of the court hearing. If the arrears are reduced below these amounts before the hearing, possession cannot be granted under this ground. Any rent arrears caused by delays in receiving Universal Credit or other benefits are ignored when calculating the level of arrears for this ground.",
    legalWording:
      "Both at the date of the service of the notice under section 8 of this Act relating to the proceedings for possession and at the date of the hearing— (a) if rent is payable weekly or fortnightly, at least thirteen weeks' rent is unpaid; (b) if rent is payable monthly, at least three months' rent is unpaid; and for the purpose of this ground \"rent\" means rent lawfully due from the tenant. When calculating how much rent is unpaid for the purpose of this ground, if the tenant is entitled to receive an amount for housing as part of an award of universal credit under Part 1 of the Welfare Reform Act 2012, any amount that was unpaid only because the tenant had not yet received the payment of that award is to be ignored.",
  },
  {
    id: "ground_10",
    number: "10",
    name: "Any rent arrears",
    type: "discretionary",
    noticePeriodWeeks: 4,
    protectedPeriodMonths: null,
    requiresArrearsCheck: false,
    explanation:
      "This ground can be used if the tenant owes any amount of rent. Possession can only be granted if the court considers it reasonable in the circumstances.",
    legalWording:
      "Some rent lawfully due from the tenant— (a) is unpaid on the date on which the proceedings for possession are begun; and (b) except where subsection (1)(b) of section 8 of this Act applies, was in arrears at the date of the service of the notice under that section relating to those proceedings.",
  },
  {
    id: "ground_11",
    number: "11",
    name: "Persistent arrears",
    type: "discretionary",
    noticePeriodWeeks: 4,
    protectedPeriodMonths: null,
    requiresArrearsCheck: false,
    explanation:
      "This ground can be used if the tenant has repeatedly delayed paying rent. Possession can only be granted if the court considers it reasonable in the circumstances.",
    legalWording:
      "Whether or not any rent is in arrears on the date on which proceedings for possession are begun, the tenant has persistently delayed paying rent which has become lawfully due.",
  },
  {
    id: "ground_12",
    number: "12",
    name: "Breach of tenancy",
    type: "discretionary",
    noticePeriodWeeks: 2,
    protectedPeriodMonths: null,
    requiresArrearsCheck: false,
    explanation:
      "This ground can be used if the tenant has broken one or more terms of the tenancy agreement that are not related to paying rent. Possession can only be granted if the court considers it reasonable in the circumstances.",
    legalWording:
      "Any obligation of the tenancy (other than one related to the payment of rent) has been broken or not performed.",
  },
  {
    id: "ground_13",
    number: "13",
    name: "Deterioration of property",
    type: "discretionary",
    noticePeriodWeeks: 2,
    protectedPeriodMonths: null,
    requiresArrearsCheck: false,
    explanation:
      "This ground can be used if the tenant or someone else living in the property has allowed the condition of the property to get worse. Possession can only be granted if the court considers it reasonable in the circumstances.",
    legalWording:
      "The condition of the dwelling-house or any of the common parts has deteriorated owing to acts of waste by, or the neglect or default of, the tenant or any other person residing in the dwelling-house and, in the case of an act of waste by, or the neglect or default of, a person lodging with the tenant or a sub-tenant of his, the tenant has not taken such steps as he ought reasonably to have taken for the removal of the lodger or sub-tenant. For the purposes of this ground, \"common parts\" means any part of a building comprising the dwelling-house and any other premises which the tenant is entitled under the terms of the tenancy to use in common with the occupiers of other dwelling-houses in which the landlord has an estate or interest.",
  },
];

export const DISCLAIMER_TEXT =
  "WISK pre-fills the official government form using the data in your account and the verbatim statutory wording for the ground(s) you select. WISK does not provide legal advice and cannot confirm that the ground you have chosen is correct for your situation, that your tenancy agreement supports it, or that service of this notice will be valid. You are responsible for the accuracy of this notice and for your own explanation in question 4.3. Possession proceedings are complex — for any contested case, or if you are unsure, seek advice from a solicitor before serving this notice. Misuse of possession grounds can result in financial penalties. WISK accepts no liability for the use of this document.";
