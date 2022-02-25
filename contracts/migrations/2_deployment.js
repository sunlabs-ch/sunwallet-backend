const GnosisSafe = artifacts.require("GnosisSafe");
const GnosisSafeProxyFactory = artifacts.require("GnosisSafeProxyFactory");

module.exports = function(deployer) {
  deployer.deploy(GnosisSafe).then(safe => {
    return deployer.deploy(GnosisSafeProxyFactory).then(factory => {
      console.log(`================================================================\n`)
      console.log(`PROXY_FACTORY_ADDRESS=${factory.address}`)
      console.log(`GNOSIS_SAFE_ADDRESS=${safe.address}\n`)
      console.log(`================================================================`)
    }).catch(error => console.log('error', error))
  })
}
