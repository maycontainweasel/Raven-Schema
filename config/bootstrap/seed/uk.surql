fn::createInstance({
	title: 'Passmed UK',
	key: 'local',
  instance: "uk",
  defaultCurrency: "gbp",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["gbp", "usd"],
--     "defaultCurrency": "gbp",
--     "pricingOptions": [1, 2, 3, 6]
--   };
