fn::createInstance({
	title: 'Passmed Philippines',
	key: 'local',
  instance: "ph",
  defaultCurrency: "php",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["php", "usd"],
--     "defaultCurrency": "php",
--     "pricingOptions": [1, 2, 3, 6]
--   };
