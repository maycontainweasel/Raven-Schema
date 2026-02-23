// *****************************************************
// Global	
// *****************************************************
-- fn::createInstance({
-- 	title: 'DMO',
-- 	key: 'dmo',
--   instance: "dmo",
-- });


// *****************************************************
// Admin Users
// *****************************************************

// User roles taxonomy (ensure default roles exist)

fn::createTerm("u", 'role', {
  "label": "Super",
  "key": "super"
})
fn::createTerm("u", 'role', {
  "label": "Admin",
  "key": "admin"
})
fn::createTerm("u", 'role', {
  "label": "Student",
  "key": "student"
})

