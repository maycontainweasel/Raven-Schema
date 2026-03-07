// *****************************************************
// Global	
// *****************************************************
fn::createInstance({
	title: 'Passmed PM',
	key: 'pm',
});

fn::createInstance({
	title: 'Passmed ZA',
	key: 'za',
});

fn::createInstance({
	title: 'Passmed UK',
	key: 'uk',
});

fn::createInstance({
	title: 'Passmed CA',
	key: 'ca',
});

fn::createInstance({
	title: 'Passmed US',
	key: 'us',
});

fn::createInstance({
	title: 'Passmed PH',
	key: 'ph',
});

fn::createInstance({
	title: 'Passmed AU',
	key: 'au',
});



// *****************************************************
// Admin Users
// *****************************************************

// User roles taxonomy (ensure default roles exist)

fn::createTerm("u", 'role', {
  "label": "Super",
  "key": "super"
});
fn::createTerm("u", 'role', {
  "label": "Admin",
  "key": "admin"
});
fn::createTerm("u", 'role', {
  "label": "Student",
  "key": "student"
});

