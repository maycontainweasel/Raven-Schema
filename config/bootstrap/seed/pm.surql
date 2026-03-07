fn::createInstance({
	title: 'Passmed Mothership',
	key: 'local',
  instance: "pm",
  defaultCurrency: "zar",
});

-- UPSERT only type::thing('instanceSettings', 'local') 
--   merge {
--     "currencies": ["zar", "usd", "gbp"],
--     "defaultCurrency": "zar",
--     "pricingOptions": [1, 2, 3, 6]
--   };
