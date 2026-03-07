fn::createInstance({
	title: 'Passmed South Africa',
	key: 'local',
  instance: "za",
  defaultCurrency: "zar",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["zar", "usd"],
--     "defaultCurrency": "zar",
--     "pricingOptions": [1, 2, 3, 6]
--   };
