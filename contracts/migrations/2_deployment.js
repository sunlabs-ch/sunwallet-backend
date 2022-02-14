const GnosisSafe = artifacts.require("GnosisSafe");
const GnosisSafeProxyFactory = artifacts.require("GnosisSafeProxyFactory");

module.exports = function(deployer) {
  deployer.deploy(GnosisSafe);
  deployer.deploy(GnosisSafeProxyFactory);
};
