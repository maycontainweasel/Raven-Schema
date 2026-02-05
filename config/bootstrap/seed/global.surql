// *****************************************************
// Global	
// *****************************************************
fn::createInstance({
	title: 'DMO',
	key: 'dmo',
  instance: "dmo",
});


// *****************************************************
// Admin Users
// *****************************************************

// User roles taxonomy (ensure default roles exist)
fn::addUserRoleTerm({ key: "super", label: "Super" });
fn::addUserRoleTerm({ key: "admin", label: "Admin" });
fn::addUserRoleTerm({ key: "student", label: "Student" });
