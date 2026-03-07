fn::createInstance({
	title: 'Passmed United States',
	key: 'local',
  instance: "us",
  defaultCurrency: "usd",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["usd"],
--     "defaultCurrency": "usd",
--     "pricingOptions": [1, 2, 3, 6]
--   };
