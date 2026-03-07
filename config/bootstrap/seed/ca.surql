fn::createInstance({
	title: 'Passmed Canada',
	key: 'local',
  instance: "ca",
  defaultCurrency: "cad",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["cad", "usd"],
--     "defaultCurrency": "cad",
--     "pricingOptions": [1, 2, 3, 6]
--   };
