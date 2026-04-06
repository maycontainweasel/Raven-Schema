define function overwrite fn::defaultInstance($options: option<object>) {
  let $defaults = {
      errorOnMissing: true,
      returnArray: false
  };

  let $options = fn::objectAssign($defaults, $options ?? {});
  
  let $localInstanceID = type::record("instance", "local");

  if(fn::RIDExists($localInstanceID)) {
      if($options.returnArray) {
          return ["local"];
      } else {
          return "local";
      };
  } else {
      if($options.errorOnMissing) {
          throw "defaultInstance | local instance code is not available at instance:local";
      } else {
          return "";
      }
  };
};
