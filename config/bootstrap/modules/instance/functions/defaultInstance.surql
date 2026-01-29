define function overwrite fn::defaultInstance($options: option<object>) {
  let $defaults = {
      errorOnMissing: true,
      returnArray: false
  };

  let $options = fn::objectAssign($defaults, $options ?? {});
  
  let $localInstanceCode = select value instance from only type::record("instance", "local");

  if($localInstanceCode) {
      if($options.returnArray) {
          return [$localInstanceCode];
      } else {
          return $localInstanceCode;
      };
  } else {
      if($options.errorOnMissing) {
          throw "defaultInstance | local instance code is not available at instance:local";
      } else {
          return "";
      }
  };
};