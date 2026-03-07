fn::createInstance({
	title: 'Passmed Australia',
	key: 'local',
  instance: "au",
	defaultCurrency: "aud",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["aud", "usd"],
--     "defaultCurrency": "aud",
--     "pricingOptions": [1, 2, 3, 6]
--   };
